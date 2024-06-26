import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" // for manipulating cookies

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
})) // app.use() is used for middlewares

app.use(express.json({ // sets limit for json data
    limit: "16kb"
}))

app.use(express.urlencoded({ // for different types of url data eg: some browser " " => %20 or -
    extended: true,
    limit: "16kb"
}))

app.use(express.static('public')) // for storing temp data

app.use(cookieParser())  // for allowing cookies availablity


// routes
import userRouter from "./routes/user.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import healthCheckRouter from "./routes/healthCheck.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter); // we have to use middleware  // sends control to user route
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/health-check", healthCheckRouter);
app.use("/api/v1/dashboard", dashboardRouter)



// url = http://localhost:8000/api/v1/users/register

export { app }
