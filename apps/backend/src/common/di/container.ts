import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@/generated/prisma";
import { prisma } from "@/common/database";

// Register the Prisma singleton so tsyringe resolves PrismaClient by class reference
container.registerInstance(PrismaClient, prisma);

export { container };
