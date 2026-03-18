import { Router } from "express";
import { authRouter } from "../modules/auth/auth.route";
import { usertypeRouter } from "../modules/users/usertype.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running"
  });
});

router.use("/auth", authRouter);
router.use(usertypeRouter);

export { router };
