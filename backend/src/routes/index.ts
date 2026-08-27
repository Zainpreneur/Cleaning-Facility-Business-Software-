import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./users.routes";
import { clientRouter } from "./clients.routes";
import { propertyRouter } from "./properties.routes";
import { serviceTypeRouter } from "./serviceTypes.routes";
import { jobRouter } from "./jobs.routes";
import { inventoryRouter } from "./inventory.routes";
import { inspectionRouter } from "./inspections.routes";
import { invoiceRouter } from "./invoices.routes";
import { dashboardRouter } from "./dashboard.routes";

export const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/clients", clientRouter);
router.use("/properties", propertyRouter);
router.use("/service-types", serviceTypeRouter);
router.use("/jobs", jobRouter);
router.use("/inventory", inventoryRouter);
router.use("/inspections", inspectionRouter);
router.use("/invoices", invoiceRouter);
router.use("/dashboard", dashboardRouter);
