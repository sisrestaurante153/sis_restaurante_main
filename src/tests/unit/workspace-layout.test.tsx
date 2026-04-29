import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout } from "@/modules/platform/ui/workspace-layout";

describe("WorkspaceLayout", () => {
  it("renders main and aside content in separate landmarks", () => {
    render(
      <WorkspaceLayout
        main={<div>conteudo principal</div>}
        aside={<div>painel contextual</div>}
      />
    );

    expect(screen.getByRole("region", { name: /conteudo principal/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /painel contextual/i })).toBeInTheDocument();
  });
});
