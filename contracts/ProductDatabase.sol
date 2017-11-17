pragma solidity ^0.4.18;

contract ProductDatabase {

    address[] public products;
    mapping(address=>bool) stored;

    function ProductDatabase() public {}

    event OnAddProductEvent(
        address _productRef,
        uint indexed _status
    );

    function () public {
        revert();
    }

    function addProduct(address _productRef, uint _status) public {
        if (!stored[_productRef]) {
            products.push(_productRef);
            stored[_productRef] = true;
            OnAddProductEvent(_productRef, _status);
        }
    }

    function getCount() public view returns (uint count) {
        return products.length;
    }
}