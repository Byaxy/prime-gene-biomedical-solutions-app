/* eslint-disable jsx-a11y/alt-text */
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
});

const PDFHeader = () => {
  return (
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
        <Text style={styles.companyInfo}>Legacy of Quality Par Excellence</Text>
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
        <Text style={styles.companyInfo}>Capitol Bypass, Monrovia-Liberia</Text>
        <Text style={styles.companyInfo}>
          +231 775508118 / +233 244364439 (whatsapp)
        </Text>
        <Text style={styles.companyInfo}>biomedicalsolutionsgh@gmail.com</Text>
        <Text style={styles.companyInfo}>primegenebiomedicalsolutions.com</Text>
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
  );
};

export default PDFHeader;
