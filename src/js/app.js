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
    $.getJSON('SupplyChainRegistry.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var SupplyChainRegistry = data;
      App.contracts.SupplyChainRegistry = TruffleContract(SupplyChainRegistry);

      // Set the provider for our contract
      App.contracts.SupplyChainRegistry.setProvider(App.web3Provider);
      return App.getActor();
    });

    $.getJSON('ProductDatabase.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var ProductDatabase = data;
      App.contracts.ProductDatabase = TruffleContract(ProductDatabase);

      // Set the provider for our contract
      App.contracts.ProductDatabase.setProvider(App.web3Provider);
    });

    $.getJSON('Product.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var Product = data;
      App.contracts.Product = TruffleContract(Product);

      // Set the provider for our contract
      App.contracts.Product.setProvider(App.web3Provider);
    });

    $.getJSON('ProductFactory.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var ProductFactory = data;
      App.contracts.ProductFactory = TruffleContract(ProductFactory);

      // Set the provider for our contract
      App.contracts.ProductFactory.setProvider(App.web3Provider);
    });

    return App.bindEvents();
  },

  
  
  bindEvents: function() {
    $(document).on('click', '#btn-register', App.registerActor);
    $(document).on('click', '#btn-add-package', App.addProduct);
  },

  getActor: function(account) {
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
        if (data[1] !== "") {
          $("#actor_name").text(data[1]);
          var type="";
          App.productDatabase = data[2];
          switch(data[0].e){
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
          }
        }
        if (type !== undefined) {
          $("#welcome-message").text("Welcome " + data[1] + "!, you are registered as " + type + ".");
        }
        App.getProducts();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  registerActor: function(event) {
    event.preventDefault();

    var ci;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.SupplyChainRegistry.deployed().then(function(instance) {
        ci = instance;
        
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

  getProducts: function(){
    App.contracts.ProductDatabase.at(App.productDatabase).then(function(instance) {
      instance.OnAddProductEvent().watch(function(error, response){
        console.log(error);
        console.log(response);
      });
      return instance.getCount();
    }).then(function(response) {
      console.log(response);
      $("#package-list tbody").empty();
      for (i = 0; i < response.c[0]; i ++) {
        (function(x){
          App.contracts.ProductDatabase.at(App.productDatabase).then(instance2=>{
            return instance2.products(x);
          }).then(address=>{
            App.contracts.Product.at(address).then(instance3=>{
              return instance3.getState();            
           }).then(data=>{
              console.log(data);
              var tr = $('<tr></tr>');
              var link = $('<td style="word-wrap: break-word; max-width: 250px;"></td>');
              link.html($('<a data-toggle="modal" data-target="#HistoryModal"></a>').html(address));
              tr.append(link);
              tr.append($("<td></td>").html(data[0]));
              tr.append($("<td></td>").html(data[2]));
              tr.append($("<td></td>").html(data[1].c[0]));
              $("#package-list tbody").append(tr);
              console.log(tr);
            });
          });
        })(i);
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  // DONE
  addProduct: function(event) {
    
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log("error 1:", error);
      }
      var account = accounts[0];
      App.contracts.ProductFactory.deployed().then(function(instance) {
        var name = $("#package").val();
        return instance.createProduct(name, {from: account});
      }).then(function(result) {
        return App.getActor();
      }).catch(function(err) {
        console.log("error 2", err.message)
      });
    });
  },

  // redo 
  changeProductStatus: function(event) {
    event.preventDefault();

    var ci;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.PackageTraker.deployed().then(function(instance) {
        ci = instance;
      
        var packageId = $("#packageId").val();
        var status = $("#status").val();
        return ci.changePackageStatus(packageId,status, {from: account});
      }).then(function(result) {
        return App.getPackages();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  }  

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
