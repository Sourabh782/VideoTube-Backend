import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
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

export default router