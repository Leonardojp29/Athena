-- La bandera la publica el proveedor junto al país; construir el URL a mano era una suposición
-- sobre su CDN, y encima equivocada: Inglaterra no es "gb", es "gb-eng".
ALTER TABLE "competitions" ADD COLUMN "flag_url" TEXT;
