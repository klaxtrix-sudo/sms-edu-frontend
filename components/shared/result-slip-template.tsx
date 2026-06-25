"use client";

import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Font,
  Image 
} from "@react-pdf/renderer";

// Register fonts if needed (simulating standard Helvetica for now)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#fff",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 40,
    borderBottom: 2,
    borderBottomColor: "#3b82f6",
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolInfo: {
    flexDirection: "column",
  },
  schoolName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    textTransform: "uppercase",
  },
  schoolAddress: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  titleContainer: {
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "black",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  studentInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 30,
    border: 1,
    borderColor: "#e2e8f0",
    padding: 15,
    borderRadius: 8,
  },
  infoItem: {
    width: "50%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    minHeight: 30,
    alignItems: "center",
  },
  tableColHeader: {
    width: "25%",
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  tableColHeaderFirst: {
     width: "40%",
     backgroundColor: "#f8fafc",
     padding: 8,
  },
  tableCol: {
    width: "15%",
    padding: 8,
  },
  tableColFirst: {
    width: "40%",
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableCell: {
    fontSize: 10,
    color: "#1e293b",
  },
  footer: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLine: {
    width: 200,
    borderTop: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  }
});

interface ResultSlipPDFProps {
  student: any;
  results: any[];
  term: string;
  year: string;
}

export const ResultSlipPDF = ({ student, results, term, year }: ResultSlipPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName}>KLAXTRIX ACADEMY</Text>
          <Text style={styles.schoolAddress}>Nigeria's Premier Digital Institution · Innovation Hub</Text>
        </View>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: "#3b82f6" }}>OFFICIAL ACADEMIC RECORD</Text>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.reportTitle}>Termly Performance Report</Text>
        <Text style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>
          Academic Year: {year} | Term: {term}
        </Text>
      </View>

      {/* Student Info */}
      <View style={styles.studentInfoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Student Name</Text>
          <Text style={styles.infoValue}>{student.full_name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Admission No</Text>
          <Text style={styles.infoValue}>{student.admission_no}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Class</Text>
          <Text style={styles.infoValue}>{student.class_name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: "#10b981" }]}>Enrolled / Active</Text>
        </View>
      </View>

      {/* Results Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRow}>
          <View style={styles.tableColHeaderFirst}>
            <Text style={styles.tableCellHeader}>Subject Course</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>CA1 + CA2</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Examination</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Total Grade</Text>
          </View>
        </View>

        {/* Table Rows */}
        {results.map((res, index) => (
          <View style={styles.tableRow} key={index}>
            <View style={styles.tableColFirst}>
              <Text style={[styles.tableCell, { fontWeight: "bold" }]}>{res.subject}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{res.ca}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{res.exam}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: "bold", color: "#3b82f6" }]}>
                {res.total} ({res.grade})
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.signatureLine}>
          <Text style={styles.signatureLabel}>Class Teacher's Signature</Text>
        </View>
        <View style={styles.signatureLine}>
          <Text style={styles.signatureLabel}>Principal's Signature & Date</Text>
        </View>
      </View>

      <Text style={{ 
        position: "absolute", 
        bottom: 30, 
        left: 40, 
        fontSize: 7, 
        color: "#94a3b8",
        fontStyle: "italic" 
      }}>
        This is a generated document. Verified by Klaxtrix Academy.
      </Text>
    </Page>
  </Document>
);
