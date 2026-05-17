// locket-dapp/contracts/LocketSocial.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LocketSocial {
    struct UserProfile {
        address wallet;
        string username;
        string avatarCID;
        bool exists;
    }

    struct Photo {
        string cid;
        string caption;
        uint256 timestamp;
        address author;
    }

    mapping(address => UserProfile) public profiles;
    mapping(address => address[]) private following;
    mapping(address => Photo[]) private userPhotos;
    mapping(address => mapping(address => bool)) private isFollowing;

    event ProfileRegistered(address indexed wallet, string username);
    event Followed(address indexed follower, address indexed followed);
    event PhotoPublished(address indexed author, string cid, uint256 timestamp);

    modifier onlyRegistered() {
        require(profiles[msg.sender].exists, "Not registered");
        _;
    }

    /**
     * @notice Registers a new user profile for the caller.
     * @param username The public username to associate with the caller wallet.
     * @param avatarCID The IPFS CID for the caller avatar image.
     */
    function registerProfile(string calldata username, string calldata avatarCID) external {
        // Gas note: calldata avoids copying external string parameters into memory.
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(bytes(username).length != 0, "Username cannot be empty");

        profiles[msg.sender] = UserProfile({
            wallet: msg.sender,
            username: username,
            avatarCID: avatarCID,
            exists: true
        });

        emit ProfileRegistered(msg.sender, username);
    }

    /**
     * @notice Follows another registered user.
     * @param target The wallet address of the user to follow.
     */
    function followUser(address target) external {
        require(target != msg.sender, "Cannot follow yourself");
        require(!isFollowing[msg.sender][target], "Already following");
        require(profiles[target].exists, "Target has no profile");

        following[msg.sender].push(target);
        isFollowing[msg.sender][target] = true;

        emit Followed(msg.sender, target);
    }

    /**
     * @notice Publishes a photo to the caller profile.
     * @param cid The IPFS CID of the uploaded photo.
     * @param caption The caption text associated with the photo.
     */
    function publishPhoto(string calldata cid, string calldata caption) external onlyRegistered {
        require(bytes(cid).length != 0, "CID cannot be empty");

        userPhotos[msg.sender].push(
            Photo({
                cid: cid,
                caption: caption,
                timestamp: block.timestamp,
                author: msg.sender
            })
        );

        emit PhotoPublished(msg.sender, cid, block.timestamp);
    }

    /**
     * @notice Returns a merged feed for the provided viewer address.
     * @param viewer The wallet address whose personalized feed should be returned.
     * @return feed A merged photo array sorted by timestamp in descending order.
     */
    function getFeed(address viewer) external view returns (Photo[] memory feed) {
        // Gas note: copying the following list to memory avoids repeated storage reads in loops.
        address[] memory followedAccounts = following[viewer];
        Photo[] storage viewerPhotos = userPhotos[viewer];
        uint256 viewerPhotoCount = viewerPhotos.length;
        uint256 totalPhotoCount = viewerPhotoCount; // uint256 avoids EVM padding costs versus smaller uint types.

        for (uint256 i = 0; i < followedAccounts.length; i++) {
            Photo[] storage followedPhotos = userPhotos[followedAccounts[i]];
            totalPhotoCount += followedPhotos.length;
        }

        feed = new Photo[](totalPhotoCount);
        uint256 writeIndex = 0;

        for (uint256 i = 0; i < viewerPhotoCount; i++) {
            feed[writeIndex] = viewerPhotos[i];
            writeIndex++;
        }

        for (uint256 i = 0; i < followedAccounts.length; i++) {
            Photo[] storage followedPhotos = userPhotos[followedAccounts[i]];
            uint256 followedPhotoCount = followedPhotos.length;

            for (uint256 j = 0; j < followedPhotoCount; j++) {
                feed[writeIndex] = followedPhotos[j];
                writeIndex++;
            }
        }

        // Insertion sort is O(n^2), which is acceptable for small on-chain feeds.
        // For larger production workloads, off-chain indexing such as The Graph is preferred.
        for (uint256 i = 1; i < writeIndex; i++) {
            Photo memory currentPhoto = feed[i];
            uint256 j = i;

            while (j > 0 && feed[j - 1].timestamp < currentPhoto.timestamp) {
                feed[j] = feed[j - 1];
                unchecked {
                    j--;
                }
            }

            feed[j] = currentPhoto;
        }
    }

    /**
     * @notice Returns the list of accounts followed by a user.
     * @param user The wallet address to inspect.
     * @return followedAccounts The addresses that the provided user follows.
     */
    function getFollowing(address user) external view returns (address[] memory followedAccounts) {
        return following[user];
    }

    /**
     * @notice Returns all photos published by a user.
     * @param user The wallet address to inspect.
     * @return photos The full photo history for the provided user.
     */
    function getUserPhotos(address user) external view returns (Photo[] memory photos) {
        return userPhotos[user];
    }

    /**
     * @notice Returns the stored profile for a user address.
     * @param user The wallet address to inspect.
     * @return profile The stored user profile.
     */
    function getProfile(address user) external view returns (UserProfile memory profile) {
        return profiles[user];
    }
}
