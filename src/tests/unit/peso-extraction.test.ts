import { describe, expect, it } from "vitest";
import { extractWeightInGrams } from "@/modules/engineering/domain/peso-extraction";

describe("extractWeightInGrams", () => {
  it("extrai gramas de um nome simples", () => {
    expect(extractWeightInGrams("Arroz Branco 200g")).toEqual({ grams: 200, rawMatch: "200g" });
  });

  it("extrai gramas de outro nome simples", () => {
    expect(extractWeightInGrams("Bife Acebolado 160g")).toEqual({ grams: 160, rawMatch: "160g" });
  });

  it("converte quilos com virgula para gramas", () => {
    const result = extractWeightInGrams("Feijoada 1,2kg");
    expect(result?.grams).toBe(1200);
  });

  it("converte quilos com ponto para gramas", () => {
    const result = extractWeightInGrams("Feijoada 1.2kg");
    expect(result?.grams).toBe(1200);
  });

  it("retorna null quando nao ha peso no nome", () => {
    expect(extractWeightInGrams("Frango Empanado (Favoritos) - Mini")).toBeNull();
  });

  it("nao reconhece ml (volume nao e tratado como peso)", () => {
    expect(extractWeightInGrams("Suco 500ml")).toBeNull();
  });

  it("nao reconhece l (volume nao e tratado como peso)", () => {
    expect(extractWeightInGrams("Refrigerante 2l")).toBeNull();
  });

  it("usa a ultima ocorrencia quando ha mais de um numero com unidade", () => {
    const result = extractWeightInGrams("Kit 100g + Extra 300g");
    expect(result?.grams).toBe(300);
  });

  it("ignora digitos sem unidade reconhecida", () => {
    expect(extractWeightInGrams("Combo2")).toBeNull();
  });
});
