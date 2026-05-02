import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// Get all notifications for the current user
notificationsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === "true";

    const where = {
      userId: req.user!.id,
      ...(unreadOnly ? { read: false } : {})
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user!.id, read: false }
      })
    ]);

    res.json({
      items: notifications,
      total,
      unreadCount,
      limit,
      offset,
      hasMore: offset + limit < total
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count only (lightweight endpoint for polling)
notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false }
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark a notification as read
notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });

    if (!notification) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
notificationsRouter.post("/mark-all-read", async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true }
    });

    res.json({ count: result.count, message: "All notifications marked as read." });
  } catch (error) {
    next(error);
  }
});

// Delete a notification
notificationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });

    if (!notification) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Clear all read notifications
notificationsRouter.delete("/", async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user!.id, read: true }
    });

    res.json({ count: result.count, message: "Read notifications cleared." });
  } catch (error) {
    next(error);
  }
});
