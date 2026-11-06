// Paletas completas del pasaporte. El diseño del pasaporte es independiente del de la web:
// cada paleta define el borde, la tinta, el papel, los brillos, las líneas y los acentos.
// `hex` es el valor que se guarda en el dispositivo (campo `accent`), así los pasaportes ya guardados siguen funcionando.

export type PassportTheme = {
  name: string;
  hex: string;
  vars: Record<`--${string}`, string>;
};

export const themes: PassportTheme[] = [
  {
    name: "Azul tinta",
    hex: "#173b5c",
    vars: {
      "--accent": "#173b5c", "--ink": "#173b5c", "--soft": "#45657c", "--rule": "#bdc9cc", "--dash": "#7891a3",
      "--paper": "#f5f0e4", "--paper-alt": "#f7f2e8", "--glow-a": "#bed6e58c", "--glow-b": "#eedba76e",
      "--ornament": "#c69a4a", "--photo-a": "#e8eff0", "--photo-b": "#f2ead8", "--slot": "#ffffff55",
    },
  },
  {
    name: "Azul río",
    hex: "#5b91b8",
    vars: {
      "--accent": "#5b91b8", "--ink": "#1d5079", "--soft": "#4a7391", "--rule": "#c2d4df", "--dash": "#7fa5be",
      "--paper": "#eef3f2", "--paper-alt": "#f1f5f4", "--glow-a": "#a9cfe699", "--glow-b": "#f1e4b877",
      "--ornament": "#c69a4a", "--photo-a": "#e1eef6", "--photo-b": "#eef0e4", "--slot": "#ffffff66",
    },
  },
  {
    name: "Verde agua",
    hex: "#659486",
    vars: {
      "--accent": "#659486", "--ink": "#25584b", "--soft": "#4a7468", "--rule": "#c3d4cb", "--dash": "#84a99b",
      "--paper": "#f1f3e6", "--paper-alt": "#f3f5e9", "--glow-a": "#b5dccb99", "--glow-b": "#efe0a577",
      "--ornament": "#b8913f", "--photo-a": "#e2efe8", "--photo-b": "#f1ecd5", "--slot": "#ffffff66",
    },
  },
  {
    name: "Lavanda",
    hex: "#8583a4",
    vars: {
      "--accent": "#8583a4", "--ink": "#4a4772", "--soft": "#66648b", "--rule": "#d2cfe0", "--dash": "#9c9abd",
      "--paper": "#f4f0f1", "--paper-alt": "#f6f2f4", "--glow-a": "#cdc9e799", "--glow-b": "#f2d9c277",
      "--ornament": "#c0955a", "--photo-a": "#ebe8f4", "--photo-b": "#f4e8e2", "--slot": "#ffffff66",
    },
  },
];

export const themeFor = (hex: string): PassportTheme => themes.find((t) => t.hex === hex) ?? themes[0];
