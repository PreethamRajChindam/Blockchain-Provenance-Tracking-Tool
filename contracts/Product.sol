pragma solidity ^0.4.18;

import "./ProductDatabase.sol";
import "./SupplyChainRegistry.sol";

contract Product {

    address PRODUCT_FACTORY;
    address REGISTRY;
    string name;
    Status currentStatus;
    address currentHolder;

    //1.MF: manufacturing, 2.RTS: ready to ship, 3.SP: shipped, 4.WH: in warehouse
    //5.ITR: in transit to retail, 6.RRS: ready retail stock, 7.SD: Sold
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
        require(int(_status)-int(currentStatus) == 1);
        require(msg.sender != _ref);
        currentStatus = _status;
        currentHolder = _ref;
        OnActionEvent(_ref, _description, now, block.number, _status);
        addProductToDatabase(_ref);
    }

    function getState() public view returns(string _name, Status _currentStatus, address _currentHolder) {
        return (name, currentStatus, currentHolder);
    }

    function addProductToDatabase(address _ref) private {
        SupplyChainRegistry scRegistry = SupplyChainRegistry(REGISTRY);
        address productDB = scRegistry.getActorDatabase(_ref);
        ProductDatabase database = ProductDatabase(productDB);
        database.addProduct(this,uint(currentStatus));
    }
}