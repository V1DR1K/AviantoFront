import type { Metadata } from "next";
import { LandingPage } from "../components/landing-page";

export const metadata: Metadata = {
  title: "Software de gestión para talleres de motos",
  description: "Perfiles, fichas, pedidos, pagos, transferencias y ventas en un mismo sistema para talleres de motos.",
};

export default function Home() {
  return <LandingPage />;
}
