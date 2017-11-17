App = {
  web3Provider: null,
  contracts: {},
  productDatabase: null,
  actors: [],
  actor: null,
  products : [],

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('ProductFactory.json', function (data) {
      App.contracts.ProductFactory = TruffleContract(data);
      App.contracts.ProductFactory.setProvider(App.web3Provider);
    });
    $.getJSON('SupplyChainRegistry.json', function (data) {
      var SupplyChainRegistry = data;
      App.contracts.SupplyChainRegistry = TruffleContract(SupplyChainRegistry);
      App.contracts.SupplyChainRegistry.setProvider(App.web3Provider);

      $.getJSON('ProductDatabase.json', function (data) {
        App.contracts.ProductDatabase = TruffleContract(data);
        App.contracts.ProductDatabase.setProvider(App.web3Provider);

        $.getJSON('Product.json', function (data) {
          App.contracts.Product = TruffleContract(data);
          App.contracts.Product.setProvider(App.web3Provider);
          return App.getActor();
        });
        return App.bindContractEvents();
      });
      return App.getActors();
    });
    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '#btn-register', App.registerActor);
    $(document).on('click', '#btn-add-package', App.addProduct);
    $(document).on('click', '#a-prod-history', App.showProductHistory);
    $(document).on('click', '#btn-rts', App.changeProductState);
  },

  bindContractEvents: function(){
    App.contracts.ProductDatabase.at(App.productDatabase).then(function (instance) {
      var event = instance.OnAddProductEvent();
      event.watch(function (error, response) {
        console.log(response);
        App.getProducts();
        $('#PackageModal').modal('hide');
        event.stopWatching();
      });
    });
  },

  refreshCombobox: function () {
    if (App.actor == undefined) {
      return;
    }
    var filteredActors = $.grep(App.actors, function (x) {
      return x.type == App.actor.type + 1;
    });
    $(filteredActors).each(function () {
      $('#actor-list').empty();
      $('<option>').val(this.address).text(this.name).appendTo('#actor-list');
    });
  },

  getActors: function () {
    var ci;
    App.contracts.SupplyChainRegistry.deployed().then(instance => {
      ci = instance;
      return instance.getCount();
    }).then(data => {
      //get list of actors
      for (i = 0; i < data.c[0]; i++) {
        (function (x) {
          ci.actorList(x).then(address => {
            ci.getActor(address).then(actor => {
              App.actors.push({ type: actor[0].c[0], name: actor[1], address: address });
              App.refreshCombobox();
            });
          });
        })(i);
      }
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  getActor: function (adopters, account) {
    //get current actor info
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];

      App.contracts.SupplyChainRegistry.deployed().then(function (instance) {
        return instance.getActor(account);
      }).then(function (actor) {
        App.productDatabase = actor[2];
        App.actor = { type: actor[0].c[0], name: actor[1], stringType: App.getStringActorType(actor[0].c[0]) };
        if (App.productDatabase == "0x0000000000000000000000000000000000000000") {
          return;
        }
        if (App.actor.stringType !== undefined) {
          $("#welcome-message").text("Welcome " + App.actor.name + "!, you are registered as " + App.actor.stringType + ".");
        }
        App.getProducts();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  registerActor: function (event) {
    event.preventDefault();

    var ci;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.SupplyChainRegistry.deployed().then(function (instance) {
        ci = instance;

        // Execute adopt as a transaction by sending account
        var name = $("#name").val();
        var type = $("#type").val();
        return ci.registerActor(type, name, { from: account });
      }).then(function (result) {
        return App.getActor();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  addProduct: function (event) {
    event.preventDefault();
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.ProductFactory.deployed().then(function (instance) {
        // Execute adopt as a transaction by sending account
        var name = $("#package").val();
        return instance.createProduct(name, { from: account });
      }).then(function (result) {

      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  getProducts: function () {
    var contractPDB = App.contracts.ProductDatabase.at(App.productDatabase);
    contractPDB.then(function (pdbInstance) {
      pdbInstance.OnAddProductEvent({}, { fromBlock: 0, toBlock: 'latest' })
        .get((error, result) => {
          result.forEach(row => {
            App.addToProducts(row.args._productRef);
          });
        });
    });
  },

  changeProductState: function (event) {
    event.preventDefault();
    var products = $('input[name="myCheckbox"]:checked');
    var statusId = parseInt($(event.target).data('id'));
    products.each(function (element) {
      var address = $(this).data('id');
      web3.eth.getAccounts(function (error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.Product.at(address).then(product => {
          const allEvents = product.allEvents({
            fromBlock: 0,
            toBlock: 'latest'
          });
          allEvents.watch((err, res) => {
            console.log(err, res);
            allEvents.stopWatching();
          });
          var ref = $('select[name="actor-list"]').val();
          return product.addAction("", statusId, ref, { from: account });
        }).catch(function (err) {
          console.log(err.message);
        });
      });
    });
  },

  showProductHistory: function(event){
    var address = $(event.target).data('id');
    var product = $.grep(App.products, function (p) {
      return p.address === address;
    });
    App.drawHistoryTable(product[0].history);
    $("#HistoryModal").modal("show");
  },

  getStringState: function (data) {
    let state;
    switch (data) {
      case 0:
        state = "Manufacturing";
        break;
      case 1:
        state = "Ready To Ship";
        break;
      case 2:
        state = "Shipping";
        break;
      case 3:
        state = "In Warehouse";
        break;
      case 4:
        state = "In Transit To Retail";
      case 5:
        state = "Ready Retail Stock";
      case 6:
        state = "Sold";
    }
    return state;
  },

  getStringActorType(data){
    var type = "";
    switch (data) {
      case 0:
        type = "Manufacturer";
        break;
      case 1:
        type = "Shipper";
        break;
      case 2:
        type = "Distributor";
        break;
      case 3:
        type = "Retailer";
        break;
      default:
        type = "";
    }
    return type;
  },

  addToProducts: function (address) {
    var exist = $.grep(App.products, function (p) {
      return p.address === address;
    });
    if (exist.length === 0) {
      var pInstance;
      App.contracts.Product.at(address).then(instance => {
        pInstance = instance;
        return pInstance.getState();
      }).then(data => {
        var product = {
          address: address,
          state: App.getStringState(data[1].c[0]),
          name: data[0],
          holder: data[2],
          history: []
        };
        App.products.push(product);
        pInstance.OnActionEvent({}, { fromBlock: 0, toBlock: 'latest' })
          .get((error, result) => {
            result.forEach(row => {
              product.history.push({
                ref: row.args._ref,
                description: row.args._description,
                timestamp: row.args._timestamp.c[0],
                blocknumber: row.args._blockNumber.c[0],
                status: row.args._status.c[0]
              });
              App.drawProductTable();
            });
            console.log(App.products);
          });
      });
    }
  },

  drawProductTable: function () {
    $("#package-list tbody").empty();
    App.products.forEach(product => {
      var tr = $('<tr></tr>');
      var link = $('<td style="word-wrap: break-word; max-width: 250px; cursor: pointer;"></td>');
      var checkbox = $('<input type="checkbox" id="selector" name="myCheckbox" onclick="selectOnlyThis(this)"> <label for="selector">Select</label>');
      checkbox.attr('data-id', product.address);
      var a = $('<a id="a-prod-history"></a>');
      a.html(product.address);
      a.attr("data-id", product.address);
      link.html(a);
      tr.append(link);
      tr.append($("<td></td>").html(product.name));
      tr.append($("<td style='word-wrap: break-word; max-width: 250px;'></td>").html(product.holder));
      tr.append($("<td></td>").html(product.state));
      tr.append($("<td></td>").html(checkbox));
      $("#package-list tbody").append(tr);
    });
  },

  drawHistoryTable: function (history) {
    $("#product-history tbody").empty();
    history.forEach(row => {
      var tr = $('<tr></tr>');
      tr.append($("<td style='word-wrap: break-word; max-width: 250px;'></td>").html(row.ref));
      tr.append($("<td></td>").html(new Date(row.timestamp*1000)));
      tr.append($("<td></td>").html(row.blocknumber));
      tr.append($("<td></td>").html(App.getStringState(row.status)));
      $("#product-history tbody").append(tr);
    });
  }
};

function selectOnlyThis(id) {
  var myCheckbox = document.getElementsByName("myCheckbox");
  Array.prototype.forEach.call(myCheckbox, function (el) {
    el.checked = false;
  });
  id.checked = true;
}

$(function () {
  $(window).load(function () {
    App.init();
  });
});
