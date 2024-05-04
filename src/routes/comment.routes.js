import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(createComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router