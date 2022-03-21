// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "openzeppelin-contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Payments is Initializable, OwnableUpgradeable {
    event tokensReceived(address from,address token,uint256 value);

	uint256 public x;

	function initialize(uint256 _x) public initializer {
		__Ownable_init();
        x = _x;
	}

	receive() external payable {}

	function payWithPermit(
		address token,
		uint256 value,
        uint256 approval, uint256 deadline, uint8 v, bytes32 r, bytes32 s
	) public returns (bool) {
		require(approval >= value, "value is greater than approval");

		//Should give permissions
        IERC20Permit(token).permit(msg.sender, address(this), approval, deadline, v, r, s);
		require(IERC20(token).transferFrom(msg.sender, address(this), value), "ERC20: transferFrom token failed");

		emit tokensReceived(msg.sender, token, value);
		return true;
	} 

	function pay(address token,uint256 value) public returns (bool) {
		require(IERC20(token).transferFrom(msg.sender, address(this), value), "ERC20: transferFrom token failed");

		emit tokensReceived(msg.sender, token, value);
		return true;
	} 

	function withdraw(address token) public onlyOwner() {
		uint256 currentBalance = IERC20(token).balanceOf(address(this));
		IERC20(token).transfer(owner(), currentBalance);
	}
}
