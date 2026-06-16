export function getTeamFormats(currentGender?: string | null): string[] {
  if (currentGender === "F") {
    return ["Dupla feminina", "Dupla mista", "Quarteto feminino", "Quarteto misto"];
  }
  return ["Dupla masculina", "Dupla mista", "Quarteto masculino", "Quarteto misto"];
}

export function formatFromCategory(category: string, gender: string): string {
  if (category === "quarteto") {
    if (gender === "X") return "Quarteto misto";
    if (gender === "F") return "Quarteto feminino";
    return "Quarteto masculino";
  }
  if (gender === "X") return "Dupla mista";
  if (gender === "F") return "Dupla feminina";
  return "Dupla masculina";
}

export function categoryGenderFromFormat(format: string): {
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
} {
  const isQuarteto = format.startsWith("Quarteto");
  const category = isQuarteto ? "quarteto" : "dupla";
  if (format.includes("misto") || format.includes("mista")) {
    return { category, gender: "X" };
  }
  if (format.includes("feminina") || format.includes("feminino")) {
    return { category, gender: "F" };
  }
  return { category, gender: "M" };
}
