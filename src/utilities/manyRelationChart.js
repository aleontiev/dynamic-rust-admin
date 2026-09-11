export const getManyRelationDefaultChart = (field, resource) => {
  if (!field || field.type !== "many" || !resource) {
    return null;
  }
  const configured = field?.extra?.views?.chart;
  if (configured && typeof configured === "object") {
    return {
      display: "chart",
      ...configured,
    };
  }
  return {
    display: "chart",
    type: "value",
    combine: resource.id_field,
    combine_using: "count",
  };
};
