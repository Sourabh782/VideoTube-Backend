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

// routes declaration
app.use("/api/v1/users", userRouter); // we have to use middleware  // sends control to user route
app.use("/api/v1/tweets", tweetRouter);


// url = http://localhost:8000/api/v1/users/register

export { app }
