/* eslint-disable jsx-a11y/alt-text */
"use client";

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { ProductWithRelations, QuotationWithRelations } from "@/types";
import { formatCurrency } from "@/lib/utils";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 10,
    color: "#072a69",
    fontFamily: "Times-Roman",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#002060",
    fontWeight: "bold",
    color: "#00fdff",
    fontSize: 9,
    paddingVertical: 4,
  },
  evenRow: {
    backgroundColor: "#E8E9E9",
  },
  col1: { width: "5%", paddingHorizontal: 5 },
  col2: { width: "10%" },
  col3: { width: "45%" },
  col4: { width: "10%", paddingHorizontal: 5 },
  col5: { width: "10%" },
  col6: { width: "10%" },
  col7: { width: "10%" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  signatureSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 20,
    marginLeft: 50,
  },
  bankSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
  bankInfo: {
    fontSize: 8,
    marginBottom: 2,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    backgroundColor: "#002060",
    paddingVertical: 5,
    paddingHorizontal: 5,
    marginTop: 20,
  },
  footerColumn: { display: "flex", flexDirection: "column" },
  footerColumnHeader: {
    fontWeight: "bold",
    marginBottom: 2,
    color: "#FFFFFF",
    fontSize: 9,
  },
  footerInfo: {
    fontSize: 8,
    marginBottom: 2,
    color: "#00fdff",
  },
  tableContainer: {
    flexGrow: 1,
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
});

const QuotationFooter = () => (
  <View style={styles.footer} fixed>
    <View style={styles.footerColumn}>
      <Text style={styles.footerColumnHeader}>Products Solutions:</Text>
      <View style={{ paddingLeft: 20 }}>
        <Text style={styles.footerInfo}>
          Medical laboratory Equipment & Consumables
        </Text>
        <Text style={styles.footerInfo}>
          Medical Imaging Equipment & Consumables
        </Text>
        <Text style={styles.footerInfo}>Medical Equipment & Consumables</Text>
        <Text style={styles.footerInfo}>Dental Equipment & Consumables</Text>
        <Text style={styles.footerInfo}>
          Veterinary Equipment & Consumables
        </Text>
        <Text style={styles.footerInfo}>
          Research & Teaching Equipment & Consumables
        </Text>
      </View>
    </View>

    <View style={styles.footerColumn}>
      <Text style={styles.footerColumnHeader}>Service Solutions:</Text>
      <View style={{ paddingLeft: 20 }}>
        <Text style={styles.footerInfo}>Consultancy Services</Text>
        <Text style={styles.footerInfo}>Training Services</Text>
        <Text style={styles.footerInfo}>QC/QA Services</Text>
        <Text style={styles.footerInfo}>OEM production</Text>
        <Text style={styles.footerInfo}>Contract manufacturing</Text>
      </View>
    </View>

    <View style={styles.footerColumn}>
      <Text style={styles.footerColumnHeader}>Support Solutions:</Text>
      <View style={{ paddingLeft: 20 }}>
        <Text style={styles.footerInfo}>Equipment Placement supports</Text>
        <Text style={styles.footerInfo}>Partnership (PPP/PPP)</Text>
        <Text style={styles.footerInfo}>Installations</Text>
        <Text style={styles.footerInfo}>Maintenance Support</Text>
      </View>
    </View>
  </View>
);

const SignatureAndBankSection = () => (
  <View wrap={false}>
    {/* Signature */}
    <View style={styles.signatureSection}>
      <Text style={{ fontWeight: "bold" }}>Stamp & Signature:</Text>
      <Image
        src="/assets/images/signature.png"
        style={{ width: 60, height: 25 }}
      />
      <Text style={{ fontWeight: "bold" }}>Sales Manager</Text>
    </View>

    {/* Bank Details - Terms & Conditions */}
    <View style={styles.bankSection}>
      <View
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <View
          style={{
            backgroundColor: "#E8E9E9",
            paddingVertical: 2,
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 9 }}>Bank Details</Text>
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            paddingHorizontal: 5,
            paddingTop: 2,
            width: "100%",
          }}
        >
          <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            <Text style={styles.bankInfo}>Bank Name:</Text>
            <Text style={{ ...styles.bankInfo, flex: 1 }}>
              Ecobank Liberia Limited.
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            <Text style={styles.bankInfo}>Address:</Text>
            <Text style={{ ...styles.bankInfo, flex: 1 }}>
              11th Street, Sinkor, Monrovia, Liberia
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            <Text style={styles.bankInfo}>Account #:</Text>
            <Text style={{ ...styles.bankInfo, flex: 1 }}>6102122392</Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            <Text style={styles.bankInfo}>Swift Code:</Text>
            <Text style={{ ...styles.bankInfo, flex: 1 }}>ECOCLRLMXXX</Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <View
          style={{
            backgroundColor: "#E8E9E9",
            paddingVertical: 2,
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 9 }}>
            Terms & Conditions
          </Text>
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            paddingHorizontal: 5,
            paddingTop: 2,
          }}
        >
          <Text style={styles.bankInfo}>
            Prices quoted here are valid for 6 months
          </Text>
          <Text style={styles.bankInfo}>Terms of payment is 30 days</Text>
          <Text style={styles.bankInfo}>
            This certifies that the Pro-Forma invoice is true and correct
          </Text>
          <Text style={styles.bankInfo}>
            When a dispute arises over subtotal or total prices, individual unit
            prices
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const QuotationPDF = ({
  quotation,
  currencySymbol,
  allProducts,
}: {
  quotation: QuotationWithRelations;
  currencySymbol: string;
  allProducts: ProductWithRelations[];
}) => {
  const { quotation: quote, customer, products } = quotation;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 20,
          }}
          fixed
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Image
              src="/assets/logos/logo2.png"
              style={{ width: 100, height: 80 }}
            />
            <Text style={styles.companyInfo}>
              Legacy of Quality Par Excellence
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              width: "100%",
            }}
          >
            <Text style={styles.title}>NORTHLAND BIOMEDICAL SOLUTIONS</Text>
            <Text style={styles.companyInfo}>
              Rockville Valley, Johnson Compound, Haile Selassie Avenue,
            </Text>
            <Text style={styles.companyInfo}>
              Capitol Bypass, Monrovia-Liberia
            </Text>
            <Text style={styles.companyInfo}>
              +231 775508118 / +233 244364439 (whatsapp)
            </Text>
            <Text style={styles.companyInfo}>
              biomedicalsolutionsgh@gmail.com
            </Text>
            <Text style={styles.companyInfo}>
              primegenebiomedicalsolutions.com
            </Text>
            <View
              style={{ width: "100%", height: 3, backgroundColor: "#0fa345" }}
            ></View>
            <View
              style={{ width: "100%", height: 3, backgroundColor: "#075323" }}
            ></View>
            <View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: "#1a74e9",
                borderColor: "#1a74e9",
              }}
            ></View>
            <View
              style={{ width: "100%", height: 3, backgroundColor: "#093c80" }}
            ></View>
          </View>
        </View>
        {/* Title */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#002060",
            paddingVertical: 4,
          }}
        >
          <Text
            style={{ ...styles.title, textAlign: "center", color: "#00fdff" }}
          >
            QUOTATION
          </Text>
        </View>

        {/* Quotation Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginVertical: 20,
            gap: 40,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              gap: 10,
            }}
          >
            <Image
              src="/assets/images/qrcode.png"
              style={{ width: 50, height: 50 }}
            />
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#E8E9E9",
                  paddingVertical: 2,
                }}
              >
                RFQ #:
              </Text>
              <Text style={{ ...styles.companyInfo, textAlign: "center" }}>
                {quote.rfqNumber || "N/A"}
              </Text>
            </View>
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              gap: 20,
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#E8E9E9",
                  paddingVertical: 2,
                }}
              >
                PFI #:
              </Text>
              <Text style={{ ...styles.companyInfo, textAlign: "center" }}>
                {quote.quotationNumber || "N/A"}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#E8E9E9",
                  paddingVertical: 2,
                }}
              >
                Date:
              </Text>
              <Text style={{ ...styles.companyInfo, textAlign: "center" }}>
                {new Date(quote.quotationDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Address Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 40,
          }}
        >
          <View
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <View
              style={{
                backgroundColor: "#E8E9E9",
                paddingVertical: 2,
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 10 }}>
                Billing Address:
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                paddingLeft: 20,
                paddingTop: 2,
              }}
            >
              <Text style={styles.companyInfo}>{customer.name}</Text>
              <Text style={styles.companyInfo}>
                {customer.address || "N/A"}
              </Text>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <View
              style={{
                backgroundColor: "#E8E9E9",
                paddingVertical: 2,
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 10 }}>
                Delivery Address:
              </Text>
            </View>
            {quote.isDeliveryAddressAdded ? (
              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: 20,
                  paddingTop: 2,
                }}
              >
                <Text style={styles.companyInfo}>
                  {quote.deliveryAddress.addressName}
                </Text>
                <Text style={styles.companyInfo}>
                  {quote.deliveryAddress.address}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: 20,
                  paddingTop: 2,
                }}
              >
                <Text style={styles.companyInfo}>{customer.name}</Text>
                <Text style={styles.companyInfo}>
                  {customer.address || "N/A"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty</Text>
            <Text style={styles.col5}>U/M</Text>
            <Text style={styles.col6}>Unit Price</Text>
            <Text style={styles.col7}>Sub-Total</Text>
          </View>

          {/* Table Rows */}
          {products.map((product, index) => (
            <View
              key={product.id}
              style={[styles.row, index % 2 === 1 ? styles.evenRow : {}]}
            >
              <Text style={styles.col1}>
                {index < 9 ? `0${index + 1}` : index + 1}
              </Text>
              <Text style={styles.col2}>{product.productID}</Text>
              <Text style={styles.col3}>{product.productName}</Text>
              <Text style={styles.col4}>{product.quantity}</Text>
              <Text style={styles.col5}>
                {
                  allProducts.find((p) => p.product.id === product.productId)
                    ?.unit.code
                }
              </Text>
              <Text style={styles.col6}>{product.unitPrice.toFixed(2)}</Text>
              <Text style={styles.col7}>{product.subTotal.toFixed(2)}</Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={styles.summaryRow}>
              <Text>Sub-Total ({currencySymbol}):</Text>
              <Text>
                {formatCurrency(
                  String(quote.subTotal.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Discount:</Text>
              <Text>
                {formatCurrency(
                  String(quote.discountAmount.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Tax:</Text>
              <Text>
                {formatCurrency(
                  String(quote.totalTaxAmount.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={{ ...styles.summaryRow, fontWeight: "bold" }}>
              <Text>Grand Total ({currencySymbol}):</Text>
              <Text>
                {formatCurrency(
                  String(quote.totalAmount.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <SignatureAndBankSection />
        </View>

        <QuotationFooter />
      </Page>
    </Document>
  );
};

export default QuotationPDF;
