// const asynchandler = (fn) => {
//   return async (req, res, next) => {
//     const safeNext = typeof next === 'function' ? next : () => {};
//     try {
//       await fn(req, res, safeNext);
//     } catch (error) {
//       if (!res.headersSent) {
//         res.status(error.statusCode || 500).json({
//           success: false,
//           message: error.message,
//         });
//       } else {
//         try { safeNext(error); } catch {}
//       }
//     }
//   };
// };
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
export default asyncHandler;