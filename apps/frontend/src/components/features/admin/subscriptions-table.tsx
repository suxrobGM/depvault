"use client";

import { useState, type ReactElement } from "react";
import { CreditCard as SubIcon } from "@mui/icons-material";
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PaginationBar } from "@/components/ui/data-display/pagination-bar";
import { SkeletonList } from "@/components/ui/data-display/skeleton-list";
import { StatusBadge } from "@/components/ui/data-display/status-badge";
import { EmptyState } from "@/components/ui/feedback/empty-state";
import { SelectField } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { PAGINATION_DEFAULTS } from "@/lib/constants";
import type { AdminSubscriptionListResponse } from "@/types/api";

const STATUS_VARIANT: Record<string, "success" | "error" | "warning" | "default"> = {
  ACTIVE: "success",
  CANCELED: "error",
  PAST_DUE: "warning",
};

const PLAN_VARIANT: Record<string, "default" | "info" | "success"> = {
  FREE: "default",
  PRO: "info",
  TEAM: "success",
};

type PlanFilter = "FREE" | "PRO" | "TEAM";

export function SubscriptionsTable(): ReactElement {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.limit);
  const [planFilter, setPlanFilter] = useState<PlanFilter | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading } = useApiQuery<AdminSubscriptionListResponse>(
    ["admin-subscriptions", page, pageSize, planFilter, statusFilter],
    () =>
      client.api.admin.subscriptions.get({
        query: {
          page,
          limit: pageSize,
          ...(planFilter !== "ALL" && { plan: planFilter }),
          ...(statusFilter !== "ALL" && { status: statusFilter }),
        },
      }),
    { errorMessage: "Failed to load subscriptions" },
  );

  const subscriptions = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", gap: 2 }}>
        <SelectField
          value={planFilter}
          onChange={(v) => {
            setPlanFilter(v as PlanFilter | "ALL");
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All Plans" },
            { value: "FREE", label: "Free" },
            { value: "PRO", label: "Pro" },
            { value: "TEAM", label: "Team" },
          ]}
        />
        <SelectField
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All Statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "CANCELED", label: "Canceled" },
            { value: "PAST_DUE", label: "Past Due" },
          ]}
          minWidth={160}
        />
      </Stack>

      {isLoading ? (
        <SkeletonList count={6} height={48} />
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={<SubIcon />} title="No subscriptions found" />
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Comp</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Period End</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {[sub.user.firstName, sub.user.lastName].filter(Boolean).join(" ") || "—"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sub.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={sub.plan} variant={PLAN_VARIANT[sub.plan] ?? "default"} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={sub.status}
                        variant={STATUS_VARIANT[sub.status] ?? "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {sub.isComp && (
                        <Chip label="Comp" size="small" color="warning" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{sub.quantity}</TableCell>
                    <TableCell>
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
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
    </Box>
  );
}
