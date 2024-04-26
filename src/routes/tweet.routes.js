import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, deleteTweet, getAllTweets, updateTweet } from "../controllers/tweet.controller.js";

const router = Router();

router.route("/create-tweet").post(
    verifyJWT,
    createTweet
)

router.route("/get-tweets/:username").get(
    getAllTweets
)

router.route("/update-tweet/:tweetId").patch(
    verifyJWT,
    updateTweet
)
router.route("/delete/:tweetId").delete(
    verifyJWT,
    deleteTweet
)

export default router