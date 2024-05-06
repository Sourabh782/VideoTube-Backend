import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

const healthCheck = asyncHandler(async (req, res)=>{
    return res.status(200).json(
        new ApiResponse(200, [], "Ok")
    )
})

export {
    healthCheck
}