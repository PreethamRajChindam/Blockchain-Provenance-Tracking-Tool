pragma solidity ^0.4.18;

import "./ProductDatabase.sol";

contract SupplyChainRegistry {

    enum ActorType { Manufacturer, Shipper, Distributor, Retailer }

    struct Actor {
        ActorType actorType;
        string name;
        address productDatabase;
    }

    mapping (address => Actor) actors;

    function registerActor(ActorType _type, string _name) public {
        ProductDatabase pdb = new ProductDatabase();
        actors[msg.sender] = Actor(_type, _name, pdb);
    }

    function getActor(address _address) public view returns (ActorType, string, address) {
        return (
            actors[_address].actorType,
            actors[_address].name,
            actors[_address].productDatabase);
    }

    function getActorDatabase(address _address) public view returns (address) {
        return actors[_address].productDatabase;
    }

    function getActorType(address _address) public view returns (ActorType) {
        return actors[_address].actorType;
    }
}