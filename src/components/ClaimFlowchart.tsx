"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ClaimStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

type Props = {
  current: ClaimStatus;
};

export function ClaimFlowchart({ current }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { t } = useI18n();

  const labels = useMemo<Record<ClaimStatus, string>>(
    () => ({
      UNKNOWN: t("status_UNKNOWN"),
      SUBMITTED: t("status_SUBMITTED"),
      APPROVED: t("status_APPROVED"),
      PAID: t("status_PAID"),
      FINISHED: t("status_FINISHED"),
      REJECTED: t("status_REJECTED"),
      PAYMENT_FAILED: t("status_PAYMENT_FAILED"),
      WITHDRAW: t("status_WITHDRAW"),
    }),
    [t]
  );

  // Inline palette to avoid external CSS coupling
  const palette = {
    nodeBg: "#ffffff",
    nodeBorder: "#94a3b8", // slate-400
    nodeActiveBorder: "#0f172a", // slate-900
    nodeCurrentBg: "#0f172a", // slate-900
    nodeCurrentText: "#ffffff",
    edge: "#94a3b8",
    edgeActive: "#0f172a",
  } as const;

  useEffect(() => {
    let cancelled = false;
    const svgEl = svgRef.current;
    if (!svgEl) return;

    (async () => {
      const d3: any = await import("d3");
      const dagreD3: any = await import("dagre-d3");

      if (cancelled) return;

      // Build graph
      const g = new dagreD3.graphlib.Graph({ multigraph: false })
        .setGraph({
          rankdir: "LR",
          nodesep: 30,
          ranksep: 40,
          marginx: 10,
          marginy: 10,
        })
        .setDefaultEdgeLabel(() => ({}));

      const mainOrder: ClaimStatus[] = ["SUBMITTED", "APPROVED", "PAID", "FINISHED"];
      const mainIdx = mainOrder.indexOf(current);
      const isActive = (status: ClaimStatus) => {
        const i = mainOrder.indexOf(status);
        return i >= 0 && mainIdx >= 0 && i <= mainIdx;
      };

      const setNode = (id: ClaimStatus) => {
        const isCurr = current === id;
        const active = isActive(id);
        const fill = isCurr ? palette.nodeCurrentBg : palette.nodeBg;
        const stroke = isCurr || active ? palette.nodeActiveBorder : palette.nodeBorder;
        const labelStyle = isCurr ? `fill: ${palette.nodeCurrentText}; font-size: 12px;` : "font-size: 12px;";
        g.setNode(id, {
          label: labels[id],
          style: `fill: ${fill}; stroke: ${stroke}; stroke-width: 1.5px;`,
          labelStyle,
          // padding in px for nicer boxes
          padding: 6,
          // shape defaults to rect; smoother corners via round-rect path post-render
        });
      };

      setNode("SUBMITTED");
      setNode("APPROVED");
      setNode("PAID");
      setNode("FINISHED");
      setNode("REJECTED");
      setNode("PAYMENT_FAILED");
      setNode("WITHDRAW");

      // Edges
      const edge = (from: ClaimStatus, to: ClaimStatus) => {
        const active = isActive(from) && (isActive(to) || current === to);
        const stroke = active ? palette.edgeActive : palette.edge;
        g.setEdge(from, to, {
          arrowhead: "thin",
          lineInterpolate: "bundle",
          // Use thin line and no fill to avoid thick triangular arrows
          style: `stroke: ${stroke}; fill: none; stroke-width: 1px;`,
        });
      };

      edge("SUBMITTED", "APPROVED");
      edge("APPROVED", "PAID");
      edge("PAID", "FINISHED");
      edge("SUBMITTED", "WITHDRAW");
      edge("SUBMITTED", "REJECTED");
      edge("APPROVED", "PAYMENT_FAILED");

      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();
      const inner = svg.append("g");

      const render = new dagreD3.render();

      // Custom thin arrowhead (V-shape, no fill) matching edge color
      (render as any).arrows().thin = function (parent: any, id: string, edge: any) {
        const marker = parent
          .append("marker")
          .attr("id", id)
          .attr("viewBox", "0 0 10 10")
          .attr("refX", 9)
          .attr("refY", 5)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto");

        const m = (edge?.style || "").match(/stroke:\s*([^;]+)/i);
        const stroke = (m ? m[1].trim() : palette.edge);

        marker
          .append("path")
          .attr("d", "M 0 0 L 10 5 L 0 10")
          .attr("fill", "none")
          .attr("stroke", stroke)
          .attr("stroke-width", 1);
      };
      render(inner, g);

      // Smooth corner rectangles
      inner.selectAll("g.node rect").attr("rx", 6).attr("ry", 6);

      // Fit to content: use viewBox with graph dimensions; width 100%, height auto
      const graphDims = g.graph();
      const w = Math.ceil(graphDims.width || 0) + 20;
      const h = Math.ceil(graphDims.height || 0) + 20;
      svg.attr("viewBox", `0 0 ${w} ${h}`);
      svg.attr("width", "100%");
      svg.attr("height", h);

      // Add lightweight zoom/pan
      const zoom = d3.zoom().on("zoom", (event: any) => {
        inner.attr("transform", event.transform);
      });
      svg.call(zoom as any);
    })();

    return () => {
      cancelled = true;
    };
  }, [current, labels, palette.edge, palette.edgeActive, palette.nodeActiveBorder, palette.nodeBg, palette.nodeBorder, palette.nodeCurrentBg, palette.nodeCurrentText]);

  return (
    <div className="w-full overflow-x-auto border rounded p-2">
      <svg ref={svgRef} role="img" aria-label="Claim flowchart" />
    </div>
  );
}
