"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getInspeccion } from "@/lib/inspeccion-service"
import { supabase } from "@/lib/supabase"
import { generatePDF } from "@/lib/pdf-generator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { parseFechaLocal } from "@/lib/bitacora-config"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Clock,
  Car,
  User,
  Clipboard,
  AlertCircle,
  CheckCircle,
  ImageIcon
} from "lucide-react"
import Link from "next/link"

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
}

function SafeImage({ src, alt, className, fallbackSrc = "/placeholder.svg" }: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const testImageUrl = async (url: string) => {
      if (!url || url.startsWith("data:")) return;
      try {
        const response = await fetch(url, {
          method: "HEAD",
          mode: "cors",
          cache: "no-cache",
        });
        if (!response.ok) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      } catch (error) {
        setHasError(true);
        setImgSrc(fallbackSrc);
      }
    };
    if (imgSrc && !imgSrc.startsWith("data:")) {
      testImageUrl(imgSrc);
    }
  }, [imgSrc, fallbackSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className={`relative ${className || ""}`}>
      <img
        src={imgSrc}
        alt={alt}
        className="object-contain w-full h-full"
        onError={handleError}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-60 rounded-md">
          <p className="text-sm text-gray-500">Imagen no disponible</p>
        </div>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    ok: { bg: "bg-green-100", text: "text-green-800", label: "OK" },
    regular: { bg: "bg-amber-100", text: "text-amber-800", label: "REGULAR" },
    malo: { bg: "bg-red-100", text: "text-red-800", label: "MALO" },
    default: { bg: "bg-gray-100", text: "text-gray-800", label: "N/A" }
  };

  const { bg, text, label } = status ? statusMap[status.toLowerCase()] || statusMap.default : statusMap.default;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {status ? label : "N/A"}
    </span>
  );
}

interface InspectionHeaderProps {
  inspeccion: any
  onDownloadPDF: () => void
}

function InspectionHeader({ inspeccion, onDownloadPDF }: InspectionHeaderProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            Inspección {inspeccion.id?.substring(0, 8)}
          </h1>
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              {inspeccion.fechaFormateada}
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              {inspeccion.hora}
            </div>
            <div className="flex items-center font-medium">
              <Car className="h-4 w-4 mr-1" />
              Placa: {inspeccion.placavehiculo}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={inspeccion.esapto ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-red-100 text-red-800 hover:bg-red-200"}
          >
            {inspeccion.esapto ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> APTO</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> NO APTO</>
            )}
          </Badge>
          <Button onClick={onDownloadPDF} className="ml-2">
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-8 w-64" />
      </div>

      <Skeleton className="h-32 w-full mb-6 rounded-lg" />

      <div className="space-y-1 mb-4">
        <Skeleton className="h-10 w-full" />
      </div>

      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col items-center justify-center h-[60vh] bg-gray-50 rounded-lg p-10">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inspección no encontrada</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          La inspección que buscas no existe o ha sido eliminada. Verifica el ID o regresa al dashboard.
        </p>
        <Button asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface PersonnelCardProps {
  title: string
  name: string
  identification: string
  position?: string | null
}

function PersonnelCard({ title, name, identification, position = null }: PersonnelCardProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center">
        <User className="h-4 w-4 mr-1" />
        {title}
      </h3>
      <p className="font-medium text-lg">{name}</p>
      <p className="text-muted-foreground text-sm">{identification}</p>
      {position && <p className="text-muted-foreground text-sm">{position}</p>}
    </div>
  );
}

interface SignatureDisplayProps {
  title: string
  signatureUrl: string
}

function SignatureDisplay({ title, signatureUrl }: SignatureDisplayProps) {
  return (
    <div>
      <h3 className="font-semibold mb-2 text-sm text-gray-600">{title}</h3>
      <div className="border rounded-lg p-4 bg-white h-40 flex items-center justify-center">
        {signatureUrl ? (
          <SafeImage
            src={`${signatureUrl}?t=${Date.now()}`}
            alt={title}
            className="h-32"
          />
        ) : (
          <div className="flex justify-center items-center text-muted-foreground text-sm">
            Firma no disponible
          </div>
        )}
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: string
  items: any[]
}

function CategorySection({ category, items }: CategorySectionProps) {
  const getHeaderColor = (category: string) => {
    const colors: Record<string, string> = {
      "01": "bg-blue-50 border-blue-200",
      "02": "bg-green-50 border-green-200",
      "03": "bg-purple-50 border-purple-200",
      "04": "bg-amber-50 border-amber-200",
      "05": "bg-rose-50 border-rose-200",
    };
    return colors[category] || "bg-gray-50 border-gray-200";
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`${getHeaderColor(category)} border-b p-4`}>
        <h3 className="font-semibold">{categoryNames[category] || `Categoría ${category}`}</h3>
      </div>
      <div className="divide-y">
        {items.map((item: any) => (
          <div key={item.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <p className="font-medium">{item.nombre}</p>
              <StatusBadge status={item.estado} />
            </div>
            {item.observacion && (
              <p className="text-sm text-muted-foreground mt-2 bg-gray-50 p-2 rounded">
                <span className="font-medium">Observación:</span> {item.observacion}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PhotoGalleryProps {
  photos: any[]
}

function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay fotos disponibles</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Esta inspección no tiene fotos adjuntas. Las fotos ayudan a documentar
          visualmente el estado del vehículo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((foto: any, index: number) => (
        <div key={foto.id || index} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="relative aspect-video">
            <SafeImage
              src={foto.url || "/placeholder.svg"}
              alt={foto.descripcion || "Foto de inspección"}
              className="object-cover w-full h-full"
            />
          </div>
          {foto.descripcion && (
            <div className="p-3 bg-white">
              <p className="text-sm">{foto.descripcion}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const categoryNames: Record<string, string> = {
  "01": "Documentación y Administración",
  "02": "Sistema Mecánico del Vehículo",
  "03": "Sistema Eléctrico y Óptico",
  "04": "Elementos de Seguridad",
  "05": "Cabina y Estructura",
  "06": "Operatividad de la Grúa",
};

export default function InspeccionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [inspeccion, setInspeccion] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("detalles");

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/auth");
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function loadInspeccion() {
      if (!params.id) return;

      const id = Array.isArray(params.id) ? params.id[0] : params.id;

      try {
        const data = await getInspeccion(id);

        // Crear objeto extendido con fechaFormateada
        const inspeccionExtendida = {
          ...data,
          fechaFormateada: data.fecha
            ? format(parseFechaLocal(data.fecha), "dd/MM/yyyy", { locale: es })
            : ""
        };

        setInspeccion(inspeccionExtendida);
      } catch (error: any) {
        console.error("Error al cargar inspección:", error);
        toast({
          title: "Error",
          description: error?.message || "Error al cargar la inspección",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    loadInspeccion();
  }, [params.id, toast, router]);

  const handleDownloadPDF = async () => {
    if (!inspeccion) return;
    try {
      const itemsFormateados = inspeccion.items.map((item: any) => ({
        id: item.item_id,
        nombre: item.nombre,
        estado: item.estado,
        observacion: item.observacion || "",
      }));

      await generatePDF({
        ...inspeccion,
        items: itemsFormateados,
        tipoInspeccion: "Inspección",
      });

      toast({
        title: "PDF generado correctamente",
        description: "El PDF ha sido descargado",
      });
    } catch (error: any) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: error?.message || "Ha ocurrido un error",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!inspeccion) {
    return <NotFoundState />;
  }

  const itemsByCategory: Record<string, any[]> = {};
  inspeccion.items?.forEach((item: any) => {
    const categoryId = item.item_id.substring(0, 2);
    if (!itemsByCategory[categoryId]) {
      itemsByCategory[categoryId] = [];
    }
    itemsByCategory[categoryId].push(item);
  });

  // Count items by status
  const statusCounts: Record<string, number> = { ok: 0, regular: 0, malo: 0, na: 0 };
  inspeccion.items?.forEach((item: any) => {
    if (item.estado) {
      const status = item.estado.toLowerCase();
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      } else {
        statusCounts.na++;
      }
    } else {
      statusCounts.na++;
    }
  });

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/dashboard" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
          </Link>
        </Button>

        {inspeccion && <InspectionHeader inspeccion={inspeccion} onDownloadPDF={handleDownloadPDF} />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="detalles" className="flex-1">
            <Clipboard className="h-4 w-4 mr-2" /> Detalles
          </TabsTrigger>
          <TabsTrigger value="items" className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" /> Ítems de Inspección
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex-1">
            <ImageIcon className="h-4 w-4 mr-2" /> Fotos
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="detalles">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                <CardDescription>
                  Detalles de la inspección realizada al vehículo con placa {inspeccion.placavehiculo}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <PersonnelCard
                    title="Datos del Operario"
                    name={inspeccion.nombreoperario}
                    identification={`CC: ${inspeccion.cedulaoperario}`}
                  />

                  {inspeccion.tieneauxiliar && (
                    <PersonnelCard
                      title="Datos del Auxiliar"
                      name={inspeccion.nombreauxiliar}
                      identification={`CC: ${inspeccion.cedulaauxiliar}`}
                    />
                  )}

                  <PersonnelCard
                    title="Datos del Inspector"
                    name={inspeccion.nombreinspector}
                    identification={`Doc: ${inspeccion.documentoinspector}`}
                    position={inspeccion.cargoinspector}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center text-gray-600">
                    <Clipboard className="h-4 w-4 mr-1" />
                    Resumen de Resultados
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">OK</p>
                      <p className="text-2xl font-bold text-green-700">{statusCounts.ok}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm text-amber-600">Regular</p>
                      <p className="text-2xl font-bold text-amber-700">{statusCounts.regular}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-600">Malo</p>
                      <p className="text-2xl font-bold text-red-700">{statusCounts.malo}</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">N/A</p>
                      <p className="text-2xl font-bold text-gray-700">{statusCounts.na}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border flex items-center justify-center">
                    <div
                      className={`flex items-center px-4 py-2 rounded-full ${
                        inspeccion.esapto
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {inspeccion.esapto ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 mr-2" />
                      )}
                      <span className="font-medium">
                        {inspeccion.esapto
                          ? "VEHÍCULO APTO PARA OPERAR"
                          : "VEHÍCULO NO APTO PARA OPERAR"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SignatureDisplay
                    title="Firma del Operario"
                    signatureUrl={inspeccion.firmadataurl}
                  />

                  <SignatureDisplay
                    title="Firma del Supervisor"
                    signatureUrl={inspeccion.firmasupervisordataurl}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Ítems de Inspección</CardTitle>
                <CardDescription>
                  Lista completa de verificaciones realizadas durante la inspección
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(itemsByCategory).sort().map(([cat, items]) => (
                  <CategorySection key={cat} category={cat} items={items} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fotos">
            <Card>
              <CardHeader>
                <CardTitle>Fotos de la Inspección</CardTitle>
                <CardDescription>
                  Evidencia fotográfica tomada durante la inspección del vehículo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoGallery photos={inspeccion.fotos || []} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
