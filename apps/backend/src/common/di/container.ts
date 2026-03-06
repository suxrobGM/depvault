import "reflect-metadata";
import { container } from "tsyringe";
import { prisma } from "@/common/database";
import { PrismaClient } from "@/generated/prisma";

// Register the Prisma singleton so tsyringe resolves PrismaClient by class reference
container.registerInstance(PrismaClient, prisma);

export { container };
