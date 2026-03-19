"use client";

import { useState, type ReactElement } from "react";
import { SubscriptionPlanName } from "@depvault/shared/constants";
import { Group as GroupIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Chip,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { ListSkeleton } from "@/components/ui/data-display/list-skeleton";
import { PaginationBar } from "@/components/ui/data-display/pagination-bar";
import { StatusBadge } from "@/components/ui/data-display/status-badge";
import { EmptyState } from "@/components/ui/feedback/empty-state";
import { SelectField } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { PAGINATION_DEFAULTS } from "@/lib/constants";
import type { AdminUserListResponse } from "@/types/api";
import { UserDetailDialog } from "./user-detail-dialog";

const PLAN_VARIANT: Record<string, "default" | "info" | "success"> = {
  FREE: "default",
  PRO: "info",
  TEAM: "success",
};

type PlanFilter = "FREE" | "PRO" | "TEAM";

export function UsersTable(): ReactElement {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.limit);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter | "ALL">("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<AdminUserListResponse>(
    ["admin-users", page, pageSize, search, planFilter],
    () =>
      client.api.admin.users.get({
        query: {
          page,
          limit: pageSize,
          ...(search && { search }),
          ...(planFilter !== "ALL" && { plan: planFilter }),
        },
      }),
    { errorMessage: "Failed to load users" },
  );

  const users = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", gap: 2 }}>
        <TextField
          placeholder="Search by name or email..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: { xs: "100%", sm: 300 } }}
        />
        <SelectField
          value={planFilter}
          onChange={(v) => {
            setPlanFilter(v as PlanFilter | "ALL");
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All Plans" },
            { value: SubscriptionPlanName.FREE, label: "Free" },
            { value: SubscriptionPlanName.PRO, label: "Pro" },
            { value: SubscriptionPlanName.TEAM, label: "Team" },
          ]}
        />
      </Stack>

      {isLoading ? (
        <ListSkeleton count={6} height={48} />
      ) : users.length === 0 ? (
        <EmptyState icon={<GroupIcon />} title="No users found" />
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Comp</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const plan = user.subscription?.plan ?? SubscriptionPlanName.FREE;
                  const status = user.subscription?.status ?? "—";
                  const isComp = user.subscription?.isComp ?? false;

                  return (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <TableCell>
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") ?? "—"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <StatusBadge label={plan} variant={PLAN_VARIANT[plan] ?? "default"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={status}
                          variant={status === "ACTIVE" ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        {isComp && (
                          <Chip label="Comp" size="small" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {pagination && (
            <PaginationBar
              count={pagination.totalPages}
              page={page}
              onChange={setPage}
              total={pagination.total}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}

      <UserDetailDialog
        open={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
        userId={selectedUserId}
      />
    </Box>
  );
}
