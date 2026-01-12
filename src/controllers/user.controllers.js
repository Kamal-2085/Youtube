import asynchandler from "../utils/asynchandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
const registerUser = asynchandler(async (req, res) => {
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
  console.log(email);
  if (
    [fullname, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload avatar");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Please upload cover image");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const user = await User.create({
    fullname: fullname,
    email: email,
    username: username.tolowerCase(),
    password: password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }
  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});
export default registerUser;
