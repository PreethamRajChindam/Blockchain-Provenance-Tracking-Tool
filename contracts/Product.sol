pragma solidity ^0.4.18;

contract Product {

    address PRODUCT_FACTORY;
    address REGISTRY;
    string name;
    Status currentStatus;
    address currentHolder;

    //MF: manufacturing, RTS: ready to ship, SP: shipped, WH: in warehouse
    //ITR: in transit to retail, RRS: ready retail stock
    enum Status {None, MF, RTS, SP, WH, ITR, RRS}

    event OnActionEvent (
        address _ref,
        string _description,
        uint _timestamp,
        uint _blockNumber,
        Status _status
    );

    function Product(string _name, address _productFactory, address _ref, address _registry) public {
        PRODUCT_FACTORY = _productFactory;
        REGISTRY = _registry;
        name = _name;
        currentStatus = Status.None;
        currentHolder = _ref;
        OnActionEvent(_ref, "Product Creation", now, block.number, Status.None);
        addProductToDatabase(_ref);
    }

    function addAction(string _description, Status _status, address _ref) public {
        require(currentStatus != _status);
        require(msg.sender != _ref);
        OnActionEvent(_ref, _description, now, block.number, _status);
        currentStatus = _status;
        currentHolder = _ref;
        addProductToDatabase(_ref);
    }

    function getState() public view returns(string _name, Status _currentStatus, address _currentHolder) {
        return (name, currentStatus, currentHolder);
    }

    function addProductToDatabase(address _ref) private {
        SupplyChainRegistry scRegistry = SupplyChainRegistry(REGISTRY);
        address productDB = scRegistry.getActorDatabase(_ref);
        ProductDatabase database = ProductDatabase(productDB);
        database.addProduct(this);
    }
}

contract ProductFactory {

    address REGISTRY;

    function ProductFactory(address _registry) public {
        REGISTRY = _registry;
    }

    function () public {
        revert();
    }

    modifier onlyManufacturer {
        SupplyChainRegistry scRegistry = SupplyChainRegistry(REGISTRY);
        require(scRegistry.getActorType(msg.sender) == SupplyChainRegistry.ActorType.Manufacturer);
        _;
    }

    function createProduct(string _name) onlyManufacturer public returns (address) {
        return new Product(_name, this, msg.sender, REGISTRY);
    }
}