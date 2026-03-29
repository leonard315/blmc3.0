import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Inquiry = sequelize.define("Inquiry", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  birthday: { type: DataTypes.STRING, allowNull: true },
  age: { type: DataTypes.INTEGER, allowNull: true },
  gender: { type: DataTypes.STRING, allowNull: true },
  civilStatus: { type: DataTypes.STRING, allowNull: true },
  religion: { type: DataTypes.STRING, allowNull: true },
  memberType: { type: DataTypes.STRING, allowNull: true },
  codeNumber: { type: DataTypes.STRING, allowNull: true },
  promisedCapital: { type: DataTypes.STRING, allowNull: true },
  paidCapital: { type: DataTypes.STRING, allowNull: true },
  dependents: { type: DataTypes.INTEGER, allowNull: true },
  occupation: { type: DataTypes.STRING, allowNull: true },
  annualIncome: { type: DataTypes.STRING, allowNull: true },
  contactNo: { type: DataTypes.STRING, allowNull: true },
  otherCooperatives: { type: DataTypes.TEXT, allowNull: true },
  familyInfo: { type: DataTypes.TEXT, allowNull: true },
  beneficiaries: { type: DataTypes.TEXT, allowNull: true },
  landInfo: { type: DataTypes.TEXT, allowNull: true },
  livestockInfo: { type: DataTypes.TEXT, allowNull: true },
  feedsInfo: { type: DataTypes.TEXT, allowNull: true },
  goal: { type: DataTypes.TEXT, allowNull: true },
  contributionHelp: { type: DataTypes.TEXT, allowNull: true },
  picturePath: { type: DataTypes.STRING, allowNull: true },
  formData: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending','successful','rejected'), defaultValue: 'pending' },
  seminarsAttended: { type: DataTypes.INTEGER, defaultValue: 0 },
  seminarSchedule: { type: DataTypes.DATE, allowNull: true },
  membershipStep: { 
    type: DataTypes.ENUM('applied','seminar_scheduled','seminar_attended','documents_submitted','approved','rejected'), 
    defaultValue: 'applied' 
  },
  adminNotes: { type: DataTypes.TEXT, allowNull: true }
});

export { sequelize };
