App = {
  web3Provider: null,
  contracts: {},
  productDatabase: null,

  init: function() {
      return App.initWeb3();
  },

  initWeb3: function() {
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

  initContract: function() {
    $.getJSON('ProductFactory.json', function(data) {
      App.contracts.ProductFactory = TruffleContract(data);
      App.contracts.ProductFactory.setProvider(App.web3Provider);
    });
    $.getJSON('SupplyChainRegistry.json', function(data) {
      var SupplyChainRegistry = data;
      App.contracts.SupplyChainRegistry = TruffleContract(SupplyChainRegistry);
      App.contracts.SupplyChainRegistry.setProvider(App.web3Provider);

      $.getJSON('ProductDatabase.json', function(data) {
        App.contracts.ProductDatabase = TruffleContract(data);
        App.contracts.ProductDatabase.setProvider(App.web3Provider);
        
        $.getJSON('Product.json', function(data) {
          App.contracts.Product = TruffleContract(data);
          App.contracts.Product.setProvider(App.web3Provider);
        });
      });

      return App.getActor();
    });   

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '#btn-register', App.registerActor);
    $(document).on('click', '#btn-add-package', App.addProduct);
    $(document).on('click', '#a-prod-history', App.getProductHistory);
    $(document).on('click', '#btn-rts', App.markAsRTS);
  },

  getActor: function(adopters, account) {
    var ci;
    
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];

      App.contracts.SupplyChainRegistry.deployed().then(function(instance) {
        ci = instance;
        return ci.getActor(account);
      }).then(function(data) {
          App.productDatabase = data[2];

          if (App.productDatabase == "0x0000000000000000000000000000000000000000") {
            return;
          }
          var type="";
          switch(data[0].c[0]){
            case 0:
              type="Manufacturer";
              break;
            case 1: 
              type="Shipper";
              break;
            case 2: 
              type="Distributor";
              break;
            case 3: 
              type="Retailer";
              break;
            default: 
              type="";
          }
        if (type !== undefined) {
          $("#welcome-message").text("Welcome " + data[1] + "!, you are registered as " + type + ".");
        }
        App.getProducts();
      }).catch(function(err) {
        console.log("this the error", err.message);
      });
    });
  },

  registerActor: function(event) {
    event.preventDefault();

    //var petId = parseInt($(event.target).data('id'));

    var ci;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.SupplyChainRegistry.deployed().then(function(instance) {
        ci = instance;
        
        // Execute adopt as a transaction by sending account
        var name = $("#name").val();
        var type = $("#type").val();
        return ci.registerActor(type,name, {from: account});
      }).then(function(result) {
        return App.getActor();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  addProduct: function(event){
    event.preventDefault();
    App.contracts.ProductDatabase.at(App.productDatabase).then(function(instance) {
      var event = instance.OnAddProductEvent();
      event.watch(function(error, response){
        console.log(response);
        App.getProducts();
        $('#PackageModal').modal('hide');
        event.stopWatching();
      });
    });
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.ProductFactory.deployed().then(function(instance) {        
        // Execute adopt as a transaction by sending account
        var name = $("#package").val();
        return instance.createProduct(name, {from: account});
      }).then(function(result) {
        
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  getProducts: function(){
    App.contracts.ProductDatabase.at(App.productDatabase).then(function(instance) {
      return instance.getCount();
    }).then(function(response) {
      $("#package-list tbody").empty();
      for (i = 0; i < response.c[0]; i ++) {
        (function(x){
          App.contracts.ProductDatabase.at(App.productDatabase).then(instance2=>{
            return instance2.products(x);
          }).then(address=>{
            App.contracts.Product.at(address).then(instance3=>{
              return instance3.getState();            
            }).then(data=>{
              let _actor;
              switch (data[1].c[0]) {
                case 0:
                _actor="Manufacturing";
                break;
              case 1: 
                _actor="Ready To Ship";
                break;
              case 2: 
                _actor="Shipping";
                break;
              case 3: 
                _actor="In Warehouse";
                break;
              case 4: 
                _actor="In Transit To Retail";
              case 5:
                _actor="Ready Retail Stock";
              case 6:
                _actor="Sold";
              }
              
              var tr = $('<tr></tr>');
              var link = $('<td style="word-wrap: break-word; max-width: 250px; cursor: pointer;"></td>');
              var checkbox = $('<input type="checkbox" id="selector" name="myCheckbox" onclick="selectOnlyThis(this)"> <label for="selector">Select</label>');
              checkbox.attr('data-id',address);
              link.html($('<a data-toggle="modal" data-target="#HistoryModal"></a>').html(address));
              tr.append(link);
              tr.append($("<td></td>").html(data[0]));
              tr.append($("<td style='word-wrap: break-word; max-width: 250px;'></td>").html(data[2]));
              tr.append($("<td></td>").html(_actor));
              tr.append($("<td></td>").html(checkbox));
              $("#package-list tbody").append(tr);
              function selectOnlyThis(id){
  var myCheckbox = document.getElementsByName("myCheckbox");
  Array.prototype.forEach.call(myCheckbox,function(el){
    el.checked = false;
  });
  id.checked = true;
}
            });
          });
        })(i);
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  getProductHistory:  function(event){
    event.preventDefault();
    var address = $(event.target).data('id');
    var events = App.contracts.Product.at(address).then(meta => {
      const allEvents = meta.allEvents({
        fromBlock: 0,
        toBlock: 'latest'
      });
      allEvents.watch((err, res) => {
        console.log(err, res);
      });
    });
    App.contracts.Product.at(address).then(instance=>{
      return instance.getState();            
    });
  },

  markAsRTS: function(event){
    event.preventDefault();
    var products = $('input[name="mark"]:checked');
    products.each(function(element) {
      var address = $(this).data('id');
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.Product.at(address).then(instance=>{
          return instance.addAction("ready to ship", 1, "", {from: account});            
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    });
    
    
    /*web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.Product.at(address).then(instance=>{
        return instance.addAction("ready to ship", 1, {from: account});            
      }).catch(function(err) {
        console.log(err.message);
      });
    });*/
  }

};

function selectOnlyThis(id){
  var myCheckbox = document.getElementsByName("myCheckbox");
  Array.prototype.forEach.call(myCheckbox,function(el){
    el.checked = false;
  });
    id.checked = true;
  }

$(function() {
  $(window).load(function() {
    App.init();
  });
});
