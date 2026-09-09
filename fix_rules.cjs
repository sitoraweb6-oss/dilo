const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// Replace isMemberUpdate
const oldMemberUpdate = `    function isMemberUpdate(paymentId) {\n      // Member can only update their own pending payment or add a message, but they cannot change status or approval fields.\n      let isOwner = request.auth.uid == resource.data.userId;\n      let unchangedStatus = request.resource.data.status == resource.data.status;\n      let unchangedApproval = request.resource.data.firstApprovedBy == resource.data.firstApprovedBy &&\n                              request.resource.data.secondApprovedBy == resource.data.secondApprovedBy;\n      return isOwner && unchangedStatus && unchangedApproval;\n    }`;
const newMemberUpdate = `    function isMemberUpdate(paymentId) {
      let isOwner = request.auth.uid == resource.data.userId;
      let isPending = resource.data.status == 'pending';
      let unchangedStatus = request.resource.data.status == resource.data.status;
      let unchangedApproval = request.resource.data.firstApprovedBy == resource.data.firstApprovedBy &&
                              request.resource.data.secondApprovedBy == resource.data.secondApprovedBy;
      let unchangedCore = request.resource.data.amount == resource.data.amount &&
                          request.resource.data.month == resource.data.month &&
                          request.resource.data.nameId == resource.data.nameId &&
                          request.resource.data.paymentType == resource.data.paymentType;
      return isOwner && isPending && unchangedStatus && unchangedApproval && unchangedCore;
    }`;

rules = rules.replace(oldMemberUpdate, newMemberUpdate);

// Replace isAdminApproval to ensure 2nd approver is different and payment is not already approved
const oldAdminApproval = `    function isAdminApproval(paymentId) {\n      let isOwner = request.auth.uid == resource.data.userId;\n      let statusChangedToLevel1 = resource.data.status == 'pending' && request.resource.data.status == 'level_1_approved';\n      let statusChangedToApproved = resource.data.status == 'level_1_approved' && request.resource.data.status == 'approved';\n      let statusChangedToRejected = request.resource.data.status == 'rejected';\n      \n      let validLevel1 = statusChangedToLevel1 && \n                        request.resource.data.firstApprovedBy == request.auth.uid &&\n                        request.resource.data.secondApprovedBy == null;\n            \n      let validLevel2 = statusChangedToApproved && \n                        request.resource.data.firstApprovedBy == resource.data.firstApprovedBy &&\n                        request.resource.data.secondApprovedBy == request.auth.uid &&\n                        request.auth.uid != resource.data.firstApprovedBy;\n\n      return isAdmin() && !isOwner && (validLevel1 || validLevel2 || statusChangedToRejected);\n    }`;
const newAdminApproval = `    function isAdminApproval(paymentId) {
      let isOwner = request.auth.uid == resource.data.userId;
      let statusChangedToLevel1 = resource.data.status == 'pending' && request.resource.data.status == 'level_1_approved';
      let statusChangedToApproved = resource.data.status == 'level_1_approved' && request.resource.data.status == 'approved';
      let statusChangedToRejected = request.resource.data.status != 'rejected' && request.resource.data.status == 'rejected';
      
      let validLevel1 = statusChangedToLevel1 && 
                        request.resource.data.firstApprovedBy == request.auth.uid &&
                        request.resource.data.secondApprovedBy == null;
            
      let validLevel2 = statusChangedToApproved && 
                        request.resource.data.firstApprovedBy == resource.data.firstApprovedBy &&
                        request.resource.data.secondApprovedBy == request.auth.uid &&
                        request.auth.uid != resource.data.firstApprovedBy;

      return isAdmin() && !isOwner && (validLevel1 || validLevel2 || statusChangedToRejected);
    }`;

rules = rules.replace(oldAdminApproval, newAdminApproval);

fs.writeFileSync('firestore.rules', rules);
console.log("firestore.rules updated.");
