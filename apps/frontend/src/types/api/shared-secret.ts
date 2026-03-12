import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type SharedSecretAuditListResponse = Data<ProjectById["secrets"]["shared"]["get"]>;
export type SharedSecretAuditItem = SharedSecretAuditListResponse["items"][number];

export type CreateShareResponse = Data<ProjectById["secrets"]["shared"]["env"]["post"]>;

export type SharedSecretInfoResponse = Data<
  ReturnType<(typeof client)["api"]["secrets"]["shared"]>["info"]["get"]
>;

export type AccessSecretResponse = Data<
  ReturnType<(typeof client)["api"]["secrets"]["shared"]>["post"]
>;
