/* eslint-disable jsx-a11y/alt-text */
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  title: {
    fontSize: 21,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 12,
    marginBottom: 3,
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
        color: "#002060",
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
          src="/assets/logos/logo3.jpeg"
          style={{ width: 130, height: 90 }}
        />
        <Text
          style={{
            fontSize: 9,
            fontWeight: "bold",
            marginBottom: 2,
          }}
        >
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
        <Text style={styles.companyInfo}>Capitol Bypass, Monrovia-Liberia</Text>
        <Text style={styles.companyInfo}>+231 775508118 / +231 888725323</Text>
        <Text style={styles.companyInfo}>
          info@northlandbiomedicalsolutions.com
        </Text>
        <Text style={styles.companyInfo}>
          www.northlandbiomedicalsolutions.com
        </Text>
      </View>
    </View>
  );
};

export default PDFHeader;
