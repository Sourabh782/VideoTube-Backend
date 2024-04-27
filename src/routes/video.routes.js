import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/upload-video").post(
    verifyJWT,
    upload.fields([
        {
            name : "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo
)

router.route("/get-video/:videoId").get(
    verifyJWT,
    getVideoById
)

router.route("/update-video/:videoId").patch(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideo
)

router.route("/delete-video/:videoId").delete(
    verifyJWT,
    deleteVideo
)

router.route("/toggle-published/:videoId").patch(
    verifyJWT,
    togglePublishStatus
)

export default router;