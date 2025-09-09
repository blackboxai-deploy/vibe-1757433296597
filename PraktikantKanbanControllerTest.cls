/**
 * @description Test class for PraktikantKanbanController
 * @author Your Name
 * @date 2024
 */
@isTest
public class PraktikantKanbanControllerTest {
    
    /**
     * @description Setup test data
     */
    @TestSetup
    static void setupTestData() {
        // Create test Praktikant records
        List<Stundenerfassung_Praktikant__c> testPraktikants = new List<Stundenerfassung_Praktikant__c>();
        
        // Create Anwesend record
        testPraktikants.add(new Stundenerfassung_Praktikant__c(
            Name_Anzeige__c = 'Test Praktikant 1',
            Taetigkeit__c = 'Software Development',
            Name_Link__c = 'https://example.com/profile1',
            AnwesendheitStatus__c = 'Anwesend'
        ));
        
        // Create Unentschuldigt record
        testPraktikants.add(new Stundenerfassung_Praktikant__c(
            Name_Anzeige__c = 'Test Praktikant 2',
            Taetigkeit__c = 'Testing',
            Name_Link__c = 'https://example.com/profile2',
            AnwesendheitStatus__c = 'Unentschuldigt'
        ));
        
        // Create Entschuldigt record
        testPraktikants.add(new Stundenerfassung_Praktikant__c(
            Name_Anzeige__c = 'Test Praktikant 3',
            Taetigkeit__c = 'Documentation',
            Name_Link__c = 'https://example.com/profile3',
            AnwesendheitStatus__c = 'Entschuldigt',
            Grund_der_Abwesenheit__c = 'Krankmeldung'
        ));
        
        insert testPraktikants;
    }
    
    /**
     * @description Test getPraktikants method
     */
    @isTest
    static void testGetPraktikants() {
        Test.startTest();
        
        List<Stundenerfassung_Praktikant__c> result = PraktikantKanbanController.getPraktikants();
        
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(3, result.size(), 'Should return 3 test records');
        
        // Verify the records are ordered by Name_Anzeige__c
        System.assertEquals('Test Praktikant 1', result[0].Name_Anzeige__c);
        System.assertEquals('Test Praktikant 2', result[1].Name_Anzeige__c);
        System.assertEquals('Test Praktikant 3', result[2].Name_Anzeige__c);
    }
    
    /**
     * @description Test updatePraktikantStatus method - success cases
     */
    @isTest
    static void testUpdatePraktikantStatusSuccess() {
        // Get test data
        List<Stundenerfassung_Praktikant__c> testPraktikants = [
            SELECT Id, Name_Anzeige__c, AnwesendheitStatus__c 
            FROM Stundenerfassung_Praktikant__c 
            ORDER BY Name_Anzeige__c
        ];
        
        Test.startTest();
        
        // Test 1: Update from Anwesend to Unentschuldigt
        Stundenerfassung_Praktikant__c result1 = PraktikantKanbanController.updatePraktikantStatus(
            testPraktikants[0].Id, 
            'Unentschuldigt', 
            ''
        );
        
        System.assertEquals('Unentschuldigt', result1.AnwesendheitStatus__c, 'Status should be updated to Unentschuldigt');
        System.assertEquals(null, result1.Grund_der_Abwesenheit__c, 'Reason should be cleared for non-Entschuldigt status');
        
        // Test 2: Update from Unentschuldigt to Entschuldigt with reason
        Stundenerfassung_Praktikant__c result2 = PraktikantKanbanController.updatePraktikantStatus(
            testPraktikants[1].Id, 
            'Entschuldigt', 
            'Arzttermin'
        );
        
        System.assertEquals('Entschuldigt', result2.AnwesendheitStatus__c, 'Status should be updated to Entschuldigt');
        System.assertEquals('Arzttermin', result2.Grund_der_Abwesenheit__c, 'Reason should be set');
        
        // Test 3: Update from Entschuldigt to Anwesend
        Stundenerfassung_Praktikant__c result3 = PraktikantKanbanController.updatePraktikantStatus(
            testPraktikants[2].Id, 
            'Anwesend', 
            ''
        );
        
        System.assertEquals('Anwesend', result3.AnwesendheitStatus__c, 'Status should be updated to Anwesend');
        System.assertEquals(null, result3.Grund_der_Abwesenheit__c, 'Reason should be cleared');
        
        Test.stopTest();
    }
    
    /**
     * @description Test updatePraktikantStatus method - error cases
     */
    @isTest
    static void testUpdatePraktikantStatusErrors() {
        List<Stundenerfassung_Praktikant__c> testPraktikants = [
            SELECT Id FROM Stundenerfassung_Praktikant__c LIMIT 1
        ];
        
        Test.startTest();
        
        // Test 1: Empty praktikantId
        try {
            PraktikantKanbanController.updatePraktikantStatus('', 'Anwesend', '');
            System.assert(false, 'Should throw exception for empty ID');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Praktikant ID is required'), 'Should throw ID required error');
        }
        
        // Test 2: Empty status
        try {
            PraktikantKanbanController.updatePraktikantStatus(testPraktikants[0].Id, '', '');
            System.assert(false, 'Should throw exception for empty status');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('New status is required'), 'Should throw status required error');
        }
        
        // Test 3: Invalid status
        try {
            PraktikantKanbanController.updatePraktikantStatus(testPraktikants[0].Id, 'InvalidStatus', '');
            System.assert(false, 'Should throw exception for invalid status');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Invalid status value'), 'Should throw invalid status error');
        }
        
        // Test 4: Invalid ID
        try {
            PraktikantKanbanController.updatePraktikantStatus('001000000000000', 'Anwesend', '');
            System.assert(false, 'Should throw exception for non-existent ID');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('not found'), 'Should throw not found error');
        }
        
        // Test 5: Entschuldigt without reason
        try {
            PraktikantKanbanController.updatePraktikantStatus(testPraktikants[0].Id, 'Entschuldigt', '');
            System.assert(false, 'Should throw exception for Entschuldigt without reason');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Grund der Abwesenheit ist erforderlich'), 'Should throw reason required error');
        }
        
        Test.stopTest();
    }
    
    /**
     * @description Test getPraktikantStats method
     */
    @isTest
    static void testGetPraktikantStats() {
        Test.startTest();
        
        PraktikantKanbanController.PraktikantStats result = PraktikantKanbanController.getPraktikantStats();
        
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(1, result.anwesendCount, 'Should have 1 Anwesend record');
        System.assertEquals(1, result.unentschuldigtCount, 'Should have 1 Unentschuldigt record');
        System.assertEquals(1, result.entschuldigtCount, 'Should have 1 Entschuldigt record');
        System.assertEquals(3, result.totalCount, 'Should have 3 total records');
    }
    
    /**
     * @description Test bulkUpdatePraktikants method
     */
    @isTest
    static void testBulkUpdatePraktikants() {
        List<Stundenerfassung_Praktikant__c> testPraktikants = [
            SELECT Id, AnwesendheitStatus__c 
            FROM Stundenerfassung_Praktikant__c 
            ORDER BY Name_Anzeige__c
        ];
        
        List<PraktikantKanbanController.PraktikantUpdate> updates = new List<PraktikantKanbanController.PraktikantUpdate>();
        
        // Update first record to Unentschuldigt
        PraktikantKanbanController.PraktikantUpdate update1 = new PraktikantKanbanController.PraktikantUpdate();
        update1.praktikantId = testPraktikants[0].Id;
        update1.newStatus = 'Unentschuldigt';
        update1.reason = '';
        updates.add(update1);
        
        // Update second record to Entschuldigt with reason
        PraktikantKanbanController.PraktikantUpdate update2 = new PraktikantKanbanController.PraktikantUpdate();
        update2.praktikantId = testPraktikants[1].Id;
        update2.newStatus = 'Entschuldigt';
        update2.reason = 'Krankmeldung';
        updates.add(update2);
        
        Test.startTest();
        
        List<Stundenerfassung_Praktikant__c> result = PraktikantKanbanController.bulkUpdatePraktikants(updates);
        
        Test.stopTest();
        
        System.assertEquals(2, result.size(), 'Should return 2 updated records');
        
        // Verify updates in database
        List<Stundenerfassung_Praktikant__c> updatedRecords = [
            SELECT Id, AnwesendheitStatus__c, Grund_der_Abwesenheit__c 
            FROM Stundenerfassung_Praktikant__c 
            WHERE Id IN :new List<String>{testPraktikants[0].Id, testPraktikants[1].Id}
            ORDER BY Name_Anzeige__c
        ];
        
        System.assertEquals('Unentschuldigt', updatedRecords[0].AnwesendheitStatus__c);
        System.assertEquals(null, updatedRecords[0].Grund_der_Abwesenheit__c);
        System.assertEquals('Entschuldigt', updatedRecords[1].AnwesendheitStatus__c);
        System.assertEquals('Krankmeldung', updatedRecords[1].Grund_der_Abwesenheit__c);
    }
    
    /**
     * @description Test bulkUpdatePraktikants method with empty input
     */
    @isTest
    static void testBulkUpdatePraktikantsEmpty() {
        Test.startTest();
        
        try {
            PraktikantKanbanController.bulkUpdatePraktikants(null);
            System.assert(false, 'Should throw exception for null input');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('No updates provided'), 'Should throw no updates error');
        }
        
        try {
            PraktikantKanbanController.bulkUpdatePraktikants(new List<PraktikantKanbanController.PraktikantUpdate>());
            System.assert(false, 'Should throw exception for empty input');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('No updates provided'), 'Should throw no updates error');
        }
        
        Test.stopTest();
    }
}