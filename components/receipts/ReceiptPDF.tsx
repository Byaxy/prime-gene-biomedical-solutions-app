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
import { PaymentMethod, ReceiptWithRelations } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import PDFFooter from "../pdf-template/PDFFooter";
import PDFHeader from "../pdf-template/PDFHeader";
import Address from "../pdf-template/Address";
import BankDetails from "../pdf-template/BankDetails";
import TermsAndConditions from "../pdf-template/TermsAndConditions";
import { ToWords } from "to-words";
import Signature2 from "../pdf-template/Signature2";
import { getCompanyConfig } from "@/lib/config/company-config";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 15,
    fontSize: 10,
    color: "#000",
    fontFamily: "Times-Roman",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: "25%",
    left: "15%",
    width: 440,
    height: 420,
    opacity: 0.1,
    zIndex: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 10,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#819AC2",
    fontWeight: "bold",
    color: "#000",
    fontSize: 10,
  },
  evenRow: {
    backgroundColor: "#D5DCE4",
  },
  col1: {
    width: "5%",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  col2: {
    width: "15%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col3: {
    width: "15%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col4: {
    width: "13%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col5: {
    width: "13%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col6: {
    width: "13%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col7: {
    width: "13%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  col8: {
    width: "13%",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  particularsCol1: {
    width: "75%",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  particularsCol2: {
    width: "25%",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  particularsSection: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
  },
  particularsText: {
    fontSize: 10,
    marginBottom: 5,
  },
  particularsAmount: {
    fontSize: 12,
    fontWeight: "bold",
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    fontWeight: "bold",
  },
  summaryRowWithBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    fontWeight: "bold",
  },
  summaryLabel: {
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    flex: 2,
  },
  summaryValue: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tableContainer: {
    flexGrow: 1,
    color: "#000",
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  signatureSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
  bankSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
});

const ReceiptPDF = ({
  receipt,
  currencySymbol,
}: {
  receipt: ReceiptWithRelations;
  currencySymbol: string;
}) => {
  const { receipt: rec, customer, items } = receipt;

  const config = getCompanyConfig();

  const getCurrencyCode = (currencySymbol: string): string => {
    const currencyMap: { [key: string]: string } = {
      $: "USD",
      "GH₵": "GHS",
      "₵": "GHS",
    };

    return currencyMap[currencySymbol || "USD"];
  };

  const currencyCode = getCurrencyCode(currencySymbol);

  const toWords = new ToWords({
    localeCode: "en-US",
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: true,
      doNotAddOnly: false,
      currencyOptions: {
        name: currencyCode === "GHS" ? "Cedi" : "Dollar",
        plural: currencyCode === "GHS" ? "Cedis" : "Dollars",
        symbol: currencySymbol,
        fractionalUnit: {
          name: currencyCode === "GHS" ? "Pesewa" : "Cent",
          plural: currencyCode === "GHS" ? "Pesewas" : "Cents",
          symbol: "",
        },
      },
    },
  });

  const fullAmountInWords = toWords.convert(rec.totalAmountReceived);

  const termsAndConditions = [
    "In a situation where a cheque is issued, the Payer, shall be responsible for the consequences of any bounced cheque.",
    "Total amount received is related to this invoice number stated here alone",
    "This receipt is valid only when signed and stamped by authorized personnel.",
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Image */}
        <Image
          style={styles.backgroundImage}
          src={config.pdfBackgroundImage}
          fixed
        />

        {/* Header */}
        <PDFHeader />

        {/* Title and Receipt Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 10,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flex: 2,
            }}
          >
            <Text style={styles.title}>OFFICIAL RECEIPT</Text>
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              color: "#000",
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
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                Date
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {formatDateTime(rec.receiptDate).dateOnly}
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
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                RCPT #
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {rec.receiptNumber || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Received From / Billing Address */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 80,
          }}
        >
          <Address
            addressTitle="Received From"
            name={customer?.name}
            address={customer?.address?.address ?? ""}
            phone={customer?.phone}
            email={customer?.email ?? ""}
            city={customer?.address?.city ?? ""}
            country={customer?.address?.country ?? ""}
          />

          <Address
            addressTitle="Billing Address"
            name={customer?.name}
            address={customer?.address?.address ?? ""}
            phone={customer?.phone ?? ""}
            email={customer?.email ?? ""}
            city={customer?.address?.city ?? ""}
            country={customer?.address?.country ?? ""}
          />
        </View>

        {/* Particulars Section */}
        <View style={styles.tableContainer}>
          <View style={styles.headerRow}>
            <Text style={{ ...styles.particularsCol1, textAlign: "center" }}>
              Particulars
            </Text>
            <Text style={{ ...styles.particularsCol2, textAlign: "center" }}>
              Amount In Figures ({currencySymbol})
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.particularsCol1}>
              <Text style={styles.particularsText}>
                An amount of{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {" "}
                  {fullAmountInWords.toLocaleUpperCase()}
                </Text>{" "}
                Being Payment for the items bought with invoice number(s) listed
                below:
              </Text>
            </View>
            <View style={styles.particularsCol2}>
              <Text
                style={{ ...styles.particularsAmount, textAlign: "center" }}
              >
                {formatCurrency(
                  String(rec.totalAmountReceived.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Receipt Items Table */}
        <View style={{ ...styles.tableContainer, marginTop: 20 }}>
          {/* Table Header */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#D5DCE4",
              fontWeight: "bold",
              color: "#000",
              fontSize: 10,
            }}
          >
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>Invoice Date</Text>
            <Text style={styles.col3}>Invoice #</Text>
            <Text style={styles.col4}>Amount Due</Text>
            <Text style={styles.col5}>Amount Paid</Text>
            <Text style={styles.col6}>Balance Due</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View key={item.receiptItem.id} style={styles.row}>
              <Text style={styles.col1}>
                {index < 9 ? `0${index + 1}` : index + 1}
              </Text>
              <Text style={styles.col2}>
                {item.receiptItem.invoiceDate
                  ? formatDateTime(item.receiptItem.invoiceDate).dateOnly
                  : "N/A"}
              </Text>
              <Text style={styles.col3}>
                {item.receiptItem.invoiceNumber || "N/A"}
              </Text>
              <Text style={styles.col4}>
                {formatCurrency(
                  String(item.receiptItem.amountDue.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
              <Text style={styles.col5}>
                {formatCurrency(
                  String(item.receiptItem.amountReceived.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
              <Text style={styles.col6}>
                {formatCurrency(
                  String((item.receiptItem.balanceDue || 0).toFixed(2)),
                  currencySymbol,
                )}
              </Text>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#D5DCE4",
              height: 15,
            }}
          ></View>

          {/* Payment Methods Table */}
          <View style={{ marginTop: 15, marginBottom: 15 }} wrap={false}>
            {(() => {
              // Group payments by method
              let cashTotal = 0;
              let mobileMoneyTotal = 0;
              const chequePayments: Array<{
                bank: string;
                chequeNumber: string;
                amount: number;
              }> = [];
              const bankPayments: Array<{
                bank: string;
                chequeNumber: string;
                amount: number;
              }> = [];

              items.forEach((item) => {
                const method =
                  item.receiptItem.paymentMethod || PaymentMethod.Cash;
                const amount = item.receiptItem.amountReceived;

                if (method === PaymentMethod.Cash) {
                  cashTotal += amount;
                } else if (method === PaymentMethod.Mobile_Money) {
                  mobileMoneyTotal += amount;
                } else if (method === PaymentMethod.Check) {
                  chequePayments.push({
                    bank: item.paymentReceived?.checkBankName || "N/A",
                    chequeNumber: item.paymentReceived?.checkNumber || "N/A",
                    amount: amount,
                  });
                } else if (method === PaymentMethod.Bank) {
                  bankPayments.push({
                    bank: item.receivingAccount?.bankName || "N/A",
                    chequeNumber: "N/A",
                    amount: amount,
                  });
                }
              });

              const combinedCashTotal = cashTotal + mobileMoneyTotal;

              return (
                <View style={{ border: "1px solid #000" }}>
                  {/* Header Row */}
                  <View style={styles.headerRow}>
                    <Text
                      style={{
                        ...styles.col2,
                        width: "25%",
                        textAlign: "center",
                        borderRight: "1px solid #000",
                      }}
                    >
                      Cash (Amount {currencySymbol})
                    </Text>
                    <Text
                      style={{
                        ...styles.col3,
                        width: "50%",
                        textAlign: "center",
                        borderRight: "1px solid #000",
                      }}
                    >
                      Cheque (Amount {currencySymbol})
                    </Text>
                    <Text
                      style={{
                        ...styles.col4,
                        width: "25%",
                        textAlign: "center",
                      }}
                    >
                      Total Amount ({currencySymbol}){"\n"}(Cash & Cheque)
                    </Text>
                  </View>

                  {/* Data Row */}
                  <View style={{ ...styles.row, borderTop: "1px solid #000" }}>
                    <Text
                      style={{
                        ...styles.col2,
                        width: "25%",
                        textAlign: "center",
                        borderRight: "1px solid #000",
                      }}
                    >
                      {combinedCashTotal > 0
                        ? formatCurrency(
                            String(combinedCashTotal.toFixed(2)),
                            currencySymbol,
                          )
                        : "-"}
                    </Text>

                    {/* Cheque Details Sub-columns */}
                    <View
                      style={{
                        width: "50%",
                        flexDirection: "row",
                        borderRight: "1px solid #000",
                      }}
                    >
                      <View
                        style={{
                          width: "33%",
                          paddingVertical: 5,
                          paddingHorizontal: 5,
                          borderRight: "1px solid #000",
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "bold",
                            marginBottom: 3,
                          }}
                        >
                          Bank
                        </Text>
                        {chequePayments.map((payment, idx) => (
                          <Text
                            key={`bank-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {payment.bank}
                          </Text>
                        ))}
                        {bankPayments.map((payment, idx) => (
                          <Text
                            key={`bank-transfer-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {payment.bank}
                          </Text>
                        ))}
                      </View>

                      <View
                        style={{
                          width: "33%",
                          paddingVertical: 5,
                          paddingHorizontal: 5,
                          borderRight: "1px solid #000",
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "bold",
                            marginBottom: 3,
                          }}
                        >
                          Cheque #
                        </Text>
                        {chequePayments.map((payment, idx) => (
                          <Text
                            key={`cheque-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {payment.chequeNumber}
                          </Text>
                        ))}
                        {bankPayments.map((payment, idx) => (
                          <Text
                            key={`ref-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {payment.chequeNumber}
                          </Text>
                        ))}
                      </View>

                      <View
                        style={{
                          width: "34%",
                          paddingVertical: 5,
                          paddingHorizontal: 5,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "bold",
                            marginBottom: 3,
                          }}
                        >
                          Amount ({currencySymbol})
                        </Text>
                        {chequePayments.map((payment, idx) => (
                          <Text
                            key={`amount-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {formatCurrency(
                              String(payment.amount.toFixed(2)),
                              currencySymbol,
                            )}
                          </Text>
                        ))}
                        {bankPayments.map((payment, idx) => (
                          <Text
                            key={`amount-transfer-${idx}`}
                            style={{
                              textAlign: "center",
                              fontSize: 9,
                              paddingBottom: 3,
                            }}
                          >
                            {formatCurrency(
                              String(payment.amount.toFixed(2)),
                              currencySymbol,
                            )}
                          </Text>
                        ))}
                      </View>
                    </View>

                    <Text
                      style={{
                        ...styles.col4,
                        width: "25%",
                        textAlign: "center",
                      }}
                    >
                      {formatCurrency(
                        String(rec.totalAmountReceived.toFixed(2)),
                        currencySymbol,
                      )}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={styles.summaryRowWithBorder}>
              <Text style={styles.summaryLabel}>
                Total Amount Due ({currencySymbol}):
              </Text>
              <View style={styles.summaryValue}>
                <Text>
                  {formatCurrency(
                    String(rec.totalAmountDue.toFixed(2)),
                    currencySymbol,
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRowWithBorder}>
              <Text style={styles.summaryLabel}>
                Total Amount Paid ({currencySymbol}):
              </Text>
              <View style={styles.summaryValue}>
                <Text>
                  {formatCurrency(
                    String(rec.totalAmountReceived.toFixed(2)),
                    currencySymbol,
                  )}
                </Text>
              </View>
            </View>
            <View
              style={{
                ...styles.summaryRowWithBorder,
                backgroundColor: "#819AC2",
              }}
            >
              <Text style={styles.summaryLabel}>
                Balance Due ({currencySymbol}):
              </Text>
              <View style={styles.summaryValue}>
                <Text>
                  {formatCurrency(
                    String(rec.totalBalanceDue.toFixed(2)),
                    currencySymbol,
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <View wrap={false}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <Signature2 title="Sales Manager" />
              <View style={{ marginRight: 20 }}>
                <Signature2 title="Customer" />
              </View>
            </View>

            {/* Bank Details - Terms & Conditions */}
            <View style={styles.bankSection}>
              <BankDetails />
              <TermsAndConditions termsAndConditions={termsAndConditions} />
            </View>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
