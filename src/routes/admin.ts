import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { notifySellerApproval } from "../utils/notifications.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

// List all sellers with their status
adminRouter.get("/sellers", async (_req, res, next) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: "SELLER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        sellerStatus: true,
        createdAt: true,
        merchant: {
          select: { id: true, businessName: true, neighborhood: true, district: true, verified: true }
        }
      }
    });
    res.json({ items: sellers });
  } catch (err) {
    next(err);
  }
});

// Approve a seller
adminRouter.patch("/sellers/:id/approve", async (req, res, next) => {
  try {
    const user = await prisma.user.updateMany({
      where: { id: req.params.id, role: "SELLER" },
      data: { sellerStatus: "APPROVED" }
    });
    if (user.count === 0) {
      res.status(404).json({ message: "Seller not found." });
      return;
    }
    
    // Send notification to seller
    await notifySellerApproval(req.params.id, true);
    
    res.json({ id: req.params.id, sellerStatus: "APPROVED" });
  } catch (err) {
    next(err);
  }
});

// Reject a seller
adminRouter.patch("/sellers/:id/reject", async (req, res, next) => {
  try {
    const user = await prisma.user.updateMany({
      where: { id: req.params.id, role: "SELLER" },
      data: { sellerStatus: "REJECTED" }
    });
    if (user.count === 0) {
      res.status(404).json({ message: "Seller not found." });
      return;
    }
    
    // Send notification to seller
    await notifySellerApproval(req.params.id, false);
    
    res.json({ id: req.params.id, sellerStatus: "REJECTED" });
  } catch (err) {
    next(err);
  }
});

// List all users
adminRouter.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, sellerStatus: true, createdAt: true }
    });
    res.json({ items: users });
  } catch (err) {
    next(err);
  }
});
