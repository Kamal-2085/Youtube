import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};
const registerUser = asyncHandler(async (req, res, next) => {
  //get user details from frontend
  //validation-not empty
  //check if user already exist:username,email
  //check for images , check for avatar
  //upload them to cloudinary
  //create user object-create entry in db
  //remove passward and refresh token field from response
  //check for user creation
  //return res
  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload avatar");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar || (!avatar.url && !avatar.secure_url)) {
    throw new ApiError(502, "Avatar upload failed");
  }

  let coverImageUrl = "";
  if (coverImageLocalPath) {
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage || (!coverImage.url && !coverImage.secure_url)) {
      throw new ApiError(502, "Cover image upload failed");
    }
    coverImageUrl = coverImage.secure_url || coverImage.url;
  }
  const user = await User.create({
    fullname: fullname,
    email: email,
    username: username.toLowerCase(),
    password: password,
    avatar: avatar.secure_url || avatar.url,
    coverImage: coverImageUrl,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});
const loginUser = asyncHandler(async (req, res, next) => {
  //req body->data
  //username or email
  //find the user
  //password check
  //acess or refresh token
  //send cookie
  const { email, password, username } = req.body ?? {};

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordMatch(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});
const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: "undefined" },
    },
    {
      new: true,
    }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});
const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
      const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decodedToken?._id);
  if (!user) {
    throw new ApiError(404, "Invalid refresh token");
  }
  if (user?.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token expired");
  }
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id);
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", newrefreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newrefreshToken },
        "Access token refreshed successfully"
      )
    );
  } catch (error) {
    throw new ApiError(401,error?.message || "Unauthorized");
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
