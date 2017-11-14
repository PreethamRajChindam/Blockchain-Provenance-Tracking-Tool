pragma solidity ^0.4.18;

contract ProductDatabase {

    address[] public products;
    mapping(address=>bool) stored;

    function ProductDatabase() public {}

    event OnAddProductEvent(
        address _productRef
    );

    function () public {
        revert();
    }

    function addProduct(address _productRef) public {
        if (stored[_productRef]) {
            revert();
        }
        products.push(_productRef);
        OnAddProductEvent(_productRef);
    }

    function getCount() public view returns (uint count) {
        return products.length;
    }
}