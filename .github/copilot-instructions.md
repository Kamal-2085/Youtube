# YouTube Backend - AI Coding Instructions

## Architecture Overview

This is a Node.js/Express backend for a YouTube-like video platform using MongoDB and Cloudinary for media storage.

**Tech Stack**: Express 5.x, MongoDB (Mongoose), JWT auth, Cloudinary, Multer, bcrypt

**Entry Points**:
- [src/index.js](src/index.js) - Initializes database connection then starts Express server
- [src/app.js](src/app.js) - Express app configuration with middleware and route mounting

## Project-Specific Patterns

### Error Handling Pattern

ALL async route handlers MUST be wrapped with `asyncHandler` from [src/utils/asynchandler.js](src/utils/asynchandler.js):

```javascript
import asyncHandler from "../utils/asynchandler.js";

const myController = asyncHandler(async (req, res, next) => {
  // Your async logic here
});
```

Throw errors using the custom `ApiError` class with status code and message:

```javascript
import ApiError from "../utils/ApiError.js";
throw new ApiError(400, "All fields are required");
```

### Response Pattern

ALL successful responses use the `ApiResponse` class from [src/utils/ApiResponse.js](src/utils/ApiResponse.js):

```javascript
import ApiResponse from "../utils/ApiResponse.js";
return res.status(200).json(new ApiResponse(200, data, "Success message"));
```

The constructor signature: `new ApiResponse(statusCode, data, message)`

### File Upload Workflow

File uploads follow this specific sequence (see [src/controllers/user.controllers.js](src/controllers/user.controllers.js#L42-L60)):

1. Multer saves files to `./public/temp` (configured in [src/middlewares/multer.middlewares.js](src/middlewares/multer.middlewares.js))
2. Access local path via `req.files?.fieldName?.[0]?.path`
3. Upload to Cloudinary using `uploadOnCloudinary(localFilePath)` from [src/utils/cloudinary.js](src/utils/cloudinary.js)
4. Cloudinary utility auto-deletes local files after upload/error
5. Store the `secure_url` or `url` from Cloudinary response in database

Example from user registration:
```javascript
const avatarLocalPath = req.files?.avatar?.[0]?.path;
const avatar = await uploadOnCloudinary(avatarLocalPath);
// Store: avatar.secure_url || avatar.url
```

### Authentication Pattern

JWT-based auth with access + refresh tokens (see [src/models/user.model.js](src/models/user.model.js#L61-L84)):

- **Access tokens**: Short-lived, include user details (_id, email, username, fullname)
- **Refresh tokens**: Longer-lived, only contain _id, stored in User model
- Both generated via instance methods: `user.generateAccessToken()` and `user.generateRefreshToken()`

Protected routes use `verifyJWT` middleware from [src/middlewares/auth.middlewares.js](src/middlewares/auth.middlewares.js):
```javascript
router.route("/logout").post(verifyJWT, logoutUser);
```

Tokens extracted from: `req.cookies.accessToken` OR `Authorization: Bearer <token>` header

### Mongoose Schema Conventions

**Password Hashing**: Pre-save hook in [src/models/user.model.js](src/models/user.model.js#L51-L56) auto-hashes passwords with bcrypt (10 rounds)

**Timestamps**: All schemas use `{ timestamps: true }` for automatic createdAt/updatedAt

**Aggregation**: Video model uses `mongoose-aggregate-paginate-v2` plugin for paginated queries

**Indexing**: Username and fullname fields are indexed for search performance

**References**: Use `Schema.Types.ObjectId` with `ref` property (e.g., Video.owner → User)

## Environment Variables

Required in `.env` file:
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 8000)
- `CORS_ORIGIN` - Allowed CORS origin
- `ACCESS_TOKEN_SECRET` & `ACCESS_TOKEN_EXPIRY` - JWT access token config
- `REFRESH_TOKEN_SECRET` & `REFRESH_TOKEN_EXPIRY` - JWT refresh token config
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary credentials

## Development Workflow

**Start dev server**: `npm run dev` (uses nodemon with dotenv and experimental JSON modules)

**Database Connection**: Connection happens in [src/db/index.js](src/db/index.js) before server starts. DB name from [src/constants.js](src/constants.js)

**Route Structure**: All routes mounted under `/api/v1/<resource>` (e.g., `/api/v1/users`)

## Common Gotchas

1. **Multer field access**: Use optional chaining `req.files?.avatar?.[0]?.path` - files may be missing
2. **Cloudinary returns**: Check both `result.url` AND `result.secure_url` (prefer secure_url)
3. **User queries**: Always `.select("-password -refreshToken")` when returning user data to client
4. **Cookie options**: Set `{ httpOnly: true, secure: true }` for auth cookies
5. **Lowercase normalization**: Usernames and emails are auto-lowercased in schema
6. **Password validation**: Use instance method `user.isPasswordMatch(password)` for comparison
