"use client";

import { Page, View, Document, StyleSheet, Text } from "@react-pdf/renderer";
import { ShipmentWithRelations } from "@/types";
import PDFHeader from "../pdf-template/PDFHeader";
import PDFFooter from "../pdf-template/PDFFooter";
import CompanyAddress from "../pdf-template/CompanyAddress";

interface Props {
  shipment: ShipmentWithRelations;
  companySettings: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    currencySymbol: string;
  };
}

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 15,
    fontSize: 10,
    color: "#072a69",
    fontFamily: "Times-Roman",
    position: "relative",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#819AC2",
    fontWeight: "bold",
    color: "#000",
    fontSize: 9,
    paddingTop: 5,
    paddingBottom: 5,
  },
  evenRow: {
    backgroundColor: "#E8E9E9",
  },
  col1: { width: "5%", paddingHorizontal: 5 },
  col2: { width: "10%" },
  col3: { width: "50%" },
  col4: { width: "8%", paddingHorizontal: 10 },
  col5: { width: "7%" },
  col6: { width: "10%" },
  col7: { width: "10%" },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "25%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tableContainer: {
    flexGrow: 1,
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  parcelCard: {
    border: "1px solid #E0E0E0",
    borderLeftWidth: 3,
    borderLeftColor: "#819AC2",
    marginBottom: 15,
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
  },
});

const ShipmentPDF = ({ shipment, companySettings }: Props) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader />
        {/* Title */}
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <Text style={styles.title}>SHIPMENT</Text>
        </View>

        {/* Address Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            marginTop: 20,
            gap: 40,
          }}
        >
          <CompanyAddress
            addressTitle="Billing Address:"
            companySettings={companySettings}
          />

          <CompanyAddress
            addressTitle="Delivery Address:"
            companySettings={companySettings}
          />
        </View>

        {/* Cargo Details Section */}
        <View style={styles.tableContainer}>
          {/* Cargo Summary */}
          {shipment.parcels && shipment.parcels.length > 0 && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 15,
                  gap: 5,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Total Packages
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {shipment.shipment.numberOfPackages || 0}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Total Items
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {shipment.shipment.totalItems || 0}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Volumetric Weight
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {shipment.parcels
                      .reduce(
                        (sum, parcel) => sum + (parcel.volumetricWeight || 0),
                        0
                      )
                      .toFixed(3)}{" "}
                    kg
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Total Gross Weight
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {shipment.parcels
                      .reduce(
                        (sum, parcel) => sum + (parcel.grossWeight || 0),
                        0
                      )
                      .toFixed(3)}{" "}
                    kg
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Chargeable Weight
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {shipment.parcels
                      .reduce(
                        (sum, parcel) => sum + (parcel.chargeableWeight || 0),
                        0
                      )
                      .toFixed(3)}{" "}
                    kg
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: 8,
                    borderRadius: 4,
                    alignItems: "center",
                    width: "13%",
                    minWidth: 80,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "medium",
                      color: "#0D47A1",
                      marginBottom: 2,
                    }}
                  >
                    Total Amount
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#0D47A1",
                    }}
                  >
                    {companySettings.currencySymbol}
                    {shipment.shipment.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Package Details */}
              {shipment.parcels.map((parcel, index) => (
                <View
                  key={parcel.id || index}
                  style={styles.parcelCard}
                  break={false}
                >
                  {/* Package Header */}
                  <View
                    style={{
                      backgroundColor: "#F5F5F5",
                      padding: 8,
                      borderBottom: "1px solid #E0E0E0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "bold",
                        color: "#072a69",
                      }}
                    >
                      Package {index + 1}/{shipment.parcels.length}:{" "}
                      {parcel.parcelNumber ||
                        `PKG-${String(index + 1).padStart(3, "0")}`}
                    </Text>
                  </View>

                  {/* Package Details Grid */}
                  <View
                    style={{
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <View style={{ width: "25%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Package Type
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {parcel.packageType || "Box"}
                        </Text>
                      </View>
                      <View style={{ width: "25%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Dimensions (cm)
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {parcel.length} × {parcel.width} × {parcel.height}
                        </Text>
                      </View>
                      <View style={{ width: "25%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Net Weight
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {(parcel.netWeight || 0).toFixed(3)} kg
                        </Text>
                      </View>
                      <View style={{ width: "25%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Gross Weight
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {(parcel.grossWeight || 0).toFixed(3)} kg
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                      }}
                    >
                      <View style={{ width: "20%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Volumetric Weight
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {(parcel.volumetricWeight || 0).toFixed(3)} kg
                        </Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Chargeable Weight
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                          }}
                        >
                          {(parcel.chargeableWeight || 0).toFixed(3)} kg
                        </Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Volumetric Divisor
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {parcel.volumetricDivisor || 5000}
                        </Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Unit Price/kg
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
                          {companySettings.currencySymbol}
                          {(parcel.unitPricePerKg || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: "medium",
                            marginBottom: 2,
                          }}
                        >
                          Total Amount
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                          }}
                        >
                          {companySettings.currencySymbol}
                          {(parcel.totalAmount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {parcel.description && (
                      <View style={{ marginBottom: 8 }}>
                        <Text
                          style={{
                            fontSize: 7,
                            color: "#1976D2",
                            fontWeight: "bold",
                            marginBottom: 2,
                          }}
                        >
                          Description
                        </Text>
                        <Text style={{ fontSize: 8 }}>
                          {parcel.description}
                        </Text>
                      </View>
                    )}

                    {/* Items Table */}
                    {parcel.items && parcel.items.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            marginBottom: 5,
                          }}
                        >
                          Items in this package ({parcel.items.length}):
                        </Text>

                        {/* Items Header */}
                        <View style={styles.headerRow}>
                          <Text style={[styles.col1, { textAlign: "center" }]}>
                            #
                          </Text>
                          <Text style={[styles.col2, { textAlign: "center" }]}>
                            Product ID
                          </Text>
                          <Text style={[styles.col3, { textAlign: "center" }]}>
                            Product Name
                          </Text>
                          <Text style={[styles.col4, { textAlign: "center" }]}>
                            Qnty
                          </Text>
                          <Text style={[styles.col5, { textAlign: "center" }]}>
                            Net Wt
                          </Text>
                          <Text style={[styles.col6, { textAlign: "center" }]}>
                            Source
                          </Text>
                        </View>

                        {/* Items Rows */}
                        {parcel.items.map((item, itemIndex) => (
                          <View
                            key={`${item.productID}-${itemIndex}`}
                            style={[
                              styles.row,
                              itemIndex % 2 === 1 ? styles.evenRow : {},
                            ]}
                          >
                            <Text
                              style={[styles.col1, { textAlign: "center" }]}
                            >
                              {itemIndex + 1}
                            </Text>
                            <Text
                              style={[styles.col2, { fontFamily: "Courier" }]}
                            >
                              {item.productID}
                            </Text>
                            <Text style={styles.col3}>{item.productName}</Text>
                            <Text
                              style={[styles.col4, { textAlign: "center" }]}
                            >
                              {item.quantity}
                            </Text>
                            <Text
                              style={[styles.col5, { textAlign: "center" }]}
                            >
                              {(item.netWeight || 0).toFixed(3)} kg
                            </Text>
                            <Text
                              style={[styles.col6, { textAlign: "center" }]}
                            >
                              {item.isPurchaseItem
                                ? item.purchaseReference
                                : "Custom"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default ShipmentPDF;
