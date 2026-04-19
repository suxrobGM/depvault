"use client";

import "@xyflow/react/dist/style.css";
import { type ReactElement } from "react";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Dependency } from "@/types/api/analysis";

interface DependencyGraphProps {
  dependencies: Dependency[];
  fileName: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

const STATUS_COLORS: Record<string, string> = {
  UP_TO_DATE: "#34d399",
  MINOR_UPDATE: "#fbbf24",
  MAJOR_UPDATE: "#f87171",
  DEPRECATED: "#9ca3af",
};

function DependencyNode(props: NodeProps<Node<{ dep: Dependency }>>): ReactElement {
  const { data } = props;
  const { dep } = data;
  const theme = useTheme();
  const borderColor = STATUS_COLORS[dep.status] ?? "#6b7280";
  const hasVulns = dep.vulnerabilities.length > 0;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        border: 2,
        borderColor,
        bgcolor: theme.palette.mode === "dark" ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.95)",
        minWidth: 140,
        boxShadow: hasVulns ? `0 0 12px rgba(248,113,113,0.5)` : `0 0 8px ${borderColor}33`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <Stack
        spacing={0.5}
        sx={{
          alignItems: "center",
        }}
      >
        <Typography
          variant="caption"
          noWrap
          sx={{
            fontWeight: 700,
            maxWidth: 160,
          }}
        >
          {dep.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.65rem",
          }}
        >
          {dep.currentVersion}
        </Typography>
        {hasVulns && (
          <Chip
            label={`${dep.vulnerabilities.length} vuln`}
            size="small"
            color="error"
            sx={{ height: 18, fontSize: "0.6rem" }}
          />
        )}
      </Stack>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </Box>
  );
}

function ProjectNode(props: NodeProps<Node<{ label: string }>>): ReactElement {
  const { data } = props;
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderRadius: 3,
        border: 2,
        borderColor: "primary.main",
        bgcolor: theme.palette.mode === "dark" ? "rgba(30,30,60,0.95)" : "rgba(240,240,255,0.95)",
        boxShadow: "0 0 16px rgba(99,102,241,0.3)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: "primary.main",
        }}
      >
        {data.label}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </Box>
  );
}

const nodeTypes = {
  dependency: DependencyNode,
  project: ProjectNode,
};

/**
 * Builds graph data from a list of dependencies. Each dependency becomes a node, and edges are created based on parent-child relationships.
 * @param dependencies The list of dependencies to visualize in the graph.
 * @param fileName The name of the project file, used as the label for the root node.
 * @returns An object containing the nodes and edges for the graph visualization.
 */
function buildGraphData(dependencies: Dependency[], fileName: string): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "project",
    type: "project",
    data: { label: fileName },
    position: { x: 0, y: 0 },
  });

  const cols = Math.ceil(Math.sqrt(dependencies.length));
  const xSpacing = 200;
  const ySpacing = 120;

  dependencies.forEach((dep, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xOffset = (cols - 1) * xSpacing * -0.5;

    const parentId = dep.parentId ?? "project";
    const nodeId = dep.id;

    nodes.push({
      id: nodeId,
      type: "dependency",
      data: { dep },
      position: {
        x: xOffset + col * xSpacing,
        y: 120 + row * ySpacing,
      },
    });

    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      animated: dep.status !== "UP_TO_DATE",
      style: { stroke: STATUS_COLORS[dep.status] ?? "#6b7280", strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
}

export function DependencyGraph(props: DependencyGraphProps): ReactElement {
  const { dependencies, fileName } = props;
  const theme = useTheme();
  const { nodes, edges } = buildGraphData(dependencies, fileName);

  return (
    <Box
      sx={{
        height: 500,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        "& .react-flow__controls-button": {
          backgroundColor: "rgba(30,30,40,0.9)",
          borderColor: "divider",
          color: "text.primary",
          fill: "currentcolor",
        },
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} />
        <Controls
          style={{
            backgroundColor: "rgba(30,30,40,0.9)",
            borderColor: theme.palette.divider,
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </Box>
  );
}
