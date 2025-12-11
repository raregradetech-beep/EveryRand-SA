// app/page.js - FINAL FIREBASE & LOGIC INTEGRATION
'use client';
import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Auth imports
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, where, writeBatch 
} from 'firebase/firestore'; // Firestore imports

import BudgetRow from '../components/BudgetRow';
import { PlusCircle, Wallet, AlertCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Collection reference in Firestore
const budgetItemsRef = collection(db, "budgetItems");
const generateId = () => `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Mock data for new users only (will be saved on first run)
const initialMockData = [
    { name: 'Salary (Net)', plannedAmount: 25000, spentAmount: 25000, type: 'income', categoryGroup: 'Income' },
    { name: 'Rent / Bond', plannedAmount: 8500, spentAmount: 8500, type: 'expense', categoryGroup: 'Housing' },
    { name: 'Groceries (Checkers/Shoprite)', plannedAmount: 4000, spentAmount: 2500, type: 'expense', categoryGroup: 'Food' },
    { name: 'R15k Emergency Fund', plannedAmount: 1500, spentAmount: 0, type: 'expense', categoryGroup: 'Savings' },
    { name: 'Black Tax / Family Support', plannedAmount: 1000, spentAmount: 1000, type: 'expense', categoryGroup: 'Giving' },
];


export default function EveryRand() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  
  const babySteps = [
    { step: 1, title: "R15k Emergency Fund", done: false },
    { step: 2, title: "Kill Debt (Snowball)", done: false },
    { step: 3, title: "Invest 15% (TFSA)", done: false },
  ];

  // --- AUTHENTICATION & INITIAL DATA LOAD ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchBudget(currentUser.uid); // Fetch budget only if logged in
      } else {
        router.push('/login'); // Redirect if NOT logged in
      }
    });
    return () => unsubscribe();
  }, []);

  async function fetchBudget(userId) {
    if (!userId) return;

    try {
      setLoading(true);
      const q = query(
          budgetItemsRef, 
          where("userId", "==", userId), // Filter by current user
          orderBy("createdAt", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      const fetchedItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      if (fetchedItems.length === 0) {
           // FIRST TIME USER: Save the mock data to their account
           await saveInitialBudget(userId);
           // Then fetch it again
           await fetchBudget(userId); 
      } else {
           setItems(fetchedItems);
      }
      
    } catch (error) {
      console.error("Error fetching budget: ", error);
    } finally {
      setLoading(false);
    }
  }

  // Function to save initial budget items for a new user
  async function saveInitialBudget(userId) {
    const batch = writeBatch(db);
    initialMockData.forEach(item => {
        const newDocRef = doc(budgetItemsRef); // Auto-generate document ID
        batch.set(newDocRef, {
            ...item,
            userId: userId,
            createdAt: new Date().toISOString(),
        });
    });
    await batch.commit();
  }


  // --- CRUD OPERATIONS ---
  function updateItem(id, field, value) {
    const numericValue = parseFloat(value) || 0;
    
    // 1. Optimistic UI update
    const newItems = items.map(item => 
      item.id === id ? { ...item, [field]: numericValue } : item
    );
    setItems(newItems);

    // 2. Update Firebase Firestore
    try {
      const itemDoc = doc(db, "budgetItems", id);
      updateDoc(itemDoc, { [field]: numericValue }); // Note: await removed for snappier UI
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }

  async function addItem(type) {
    if (!user) return; 
    const name = prompt(`What is the name of the new ${type} category?`);
    if (!name) return;
    
    const newItemData = {
      name: name,
      plannedAmount: 0,
      spentAmount: 0,
      type: type,
      categoryGroup: type === 'income' ? 'Income' : 'General',
      createdAt: new Date().toISOString(),
      userId: user.uid, 
    };
    
    // 1. Add to Firebase
    try {
      const docRef = await addDoc(budgetItemsRef, newItemData);
      
      // 2. Update local state
      setItems([...items, { ...newItemData, id: docRef.id }]);
      
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  }

  async function deleteItem(id) {
    if(!confirm("Are you sure you want to delete this category?")) return;
    
    // 1. Delete from local state
    setItems(items.filter(i => i.id !== id));
    
    // 2. Delete from Firebase
    try {
      await deleteDoc(doc(db, "budgetItems", id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  }
  
  // --- TEMPLATE & ROLLOVER LOGIC ---
  async function applyTemplate() {
    if (!user || !confirm("Ready for a new month? This will reset expenses and apply rollovers.")) return;

    setLoading(true);
    const batch = writeBatch(db);

    items.forEach(item => {
        const remaining = (item.plannedAmount || 0) - (item.spentAmount || 0);

        let newPlannedAmount = item.plannedAmount;
        let newSpentAmount = 0;
        
        // ROLLOVER LOGIC: Carry over the surplus for savings/investment
        if ((item.categoryGroup === 'Savings' || item.categoryGroup === 'Investment') && remaining > 0) {
            newPlannedAmount = remaining; // Next month starts with the leftover amount
        }

        const itemDoc = doc(db, "budgetItems", item.id);
        batch.update(itemDoc, { 
            plannedAmount: newPlannedAmount,
            spentAmount: newSpentAmount 
        });
    });

    await batch.commit();
    
    // Re-fetch to update the UI
    await fetchBudget(user.uid);
    alert("New month started! Rollovers applied successfully.");
    setLoading(false);
  }


  // --- CALCULATIONS ---
  const totalIncome = items.filter(i => i.type === 'income').reduce((sum, i) => sum + (i.plannedAmount || 0), 0);
  const totalExpenses = items.filter(i => i.type === 'expense').reduce((sum, i) => sum + (i.plannedAmount || 0), 0);
  const leftToBudget = totalIncome - totalExpenses;

  const handleLogout = async () => {
      await signOut(auth);
      router.push('/login'); 
  }


  // --- RENDER ---
  if (loading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-lg font-medium text-blue-600">Loading Every Rand... Securing your budget...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER / DASHBOARD */}
      <header className="bg-blue-600 text-white p-6 shadow-lg relative">
        <div className="max-w-3xl mx-auto text-center">
            {/* Logout Button */}
            <button 
                onClick={handleLogout} 
                className="absolute top-4 right-4 text-white/80 hover:text-white transition duration-150 flex items-center gap-1 text-sm"
            >
                <LogOut size={16} /> Log Out
            </button>
            
            <h1 className="text-3xl font-bold tracking-tight mb-2">Every Rand 🇿🇦</h1>
            <p className="opacity-80 mb-6">Give every rand a name.</p>
            
            {/* THE BIG NUMBER (Zero-Based Logic) */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 inline-block w-full max-w-sm">
                <div className="text-sm font-medium uppercase tracking-widest opacity-80 mb-1">Left to Budget</div>
                <div className={`text-4xl font-extrabold ${leftToBudget === 0 ? 'text-green-300' : 'text-white'}`}>
                    R {leftToBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
                {leftToBudget !== 0 && (
                    <div className="mt-2 text-xs flex items-center justify-center text-yellow-300 gap-1">
                        <AlertCircle size={12} />
                        <span>You must budget this down to R0.00!</span>
                    </div>
                )}
            </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto -mt-6 px-4">
        
        {/* CONTROL PANEL (Template Button) */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Current Month</h3>
            <button onClick={applyTemplate} className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-md">
                Start Next Month
            </button>
        </div>

        {/* BABY STEPS WIDGET */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
           <h3 className="text-gray-500 font-bold text-xs uppercase mb-3">Your Baby Steps</h3>
           <div className="flex gap-2 overflow-x-auto pb-2">
             {babySteps.map(step => (
               <div key={step.step} className="min-w-[120px] bg-blue-50 p-3 rounded border border-blue-100 flex flex-col items-center text-center">
                 <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold mb-2">
                   {step.step}
                 </div>
                 <span className="text-xs font-bold text-blue-900 leading-tight">{step.title}</span>
               </div>
             ))}
           </div>
        </div>

        {/* BUDGET GROUPS */}
        <div className="space-y-6">
          
          {/* INCOME SECTION */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
              <h2 className="font-bold text-green-800 flex items-center gap-2">
                <Wallet size={18} /> Income
              </h2>
              <span className="font-mono font-bold text-green-700">R {totalIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              {items.filter(i => i.type === 'income').map(item => (
                <BudgetRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
              ))}
            </div>
            {/* ADD INCOME CATEGORY BUTTON */}
            <button onClick={() => addItem('income')} className="w-full py-3 text-sm font-bold text-green-600 hover:bg-green-50 transition flex items-center justify-center gap-2">
              <PlusCircle size={16} /> Add Income Category
            </button>
          </section>

          {/* EXPENSES SECTION */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
              <h2 className="font-bold text-red-800 flex items-center gap-2">
                <Wallet size={18} /> Expenses
              </h2>
              <span className="font-mono font-bold text-red-700">R {totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              {items.filter(i => i.type === 'expense').map(item => (
                <BudgetRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
              ))}
            </div>
             {/* ADD EXPENSE CATEGORY BUTTON */}
             <button onClick={() => addItem('expense')} className="w-full py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-2">
              <PlusCircle size={16} /> Add Expense Category
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
