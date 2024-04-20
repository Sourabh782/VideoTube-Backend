import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage, updateUserDetails } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverimage",
            maxCount: 1
        }
    ]),
    registerUser
) // on /register call registerUser()

router.route("/login").post(
    loginUser
)

// secured routes
router.route("/logout").post(
    verifyJWT, // on this route first call verifyJWT and then use its next() to call logoutUser
    // we can add more middleware
    logoutUser 
)

router.route("/refreshToken").post(
    refreshAccessToken
)

router.route("/updateCoverImage").patch(
    verifyJWT,
    upload.single("coverimage"),
    updateUserCoverImage
)

router.route("/updateAvatarImage").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

router.route("/changePassword").post(
    verifyJWT,
    changeCurrentPassword
)

router.route("/currentUser").get(
    verifyJWT,
    getCurrentUser
)

router.route("/updateAccount").patch(
    verifyJWT,
    updateUserDetails
)

router.route("/channel/:username").get(
    verifyJWT,
    getUserChannelProfile
)

router.route("/history").get(
    verifyJWT,
    getWatchHistory
)


export default router