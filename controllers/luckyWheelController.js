const LuckyTransaction = require("../models/LuckyTransictionsModel.js");
const User = require("../models/userModel.js");  // Import the User model
const Ref=require('../models/referModel')

let firstBet = 0;
let secondBet = 0;
let thirdBet = 0;
let winner = null;

const generateAndBroadcastNumber = (io) => {
  let lastNumbers=[0,0,0,0,0,0,0,0,0,0,0,0]
  let targetNumber = 0;
  let currentNumber = 0;
  let timeRemaining = 20; // Initial countdown time in seconds
  let intervalId = null;
  const generateAndBroadcast = () => {
    targetNumber = 10;
    currentNumber = 0;
    timeRemaining = 20; // Use the generated number for countdown time
    let a=0,b=0,c=0;
    winner = '';
    let spin=false
    
    clearInterval(intervalId);

    intervalId = setInterval(() => {
      

      if (timeRemaining > 0) {
        timeRemaining--;
        a+=Math.floor(Math.random() * (191)) + 10;
        b+=Math.floor(Math.random() * (191)) + 10;
        c+=Math.floor(Math.random() * (191)) + 10;
        io.emit('spinPlaced',{red:firstBet,yellow:secondBet,blue:thirdBet})
        io.emit('luckyBet', { number: currentNumber, time: timeRemaining,spin:spin, result: winner,firstBet:a,secondBet:b,thirdBet:c,a:lastNumbers[0],b:lastNumbers[1],c:lastNumbers[2],d:lastNumbers[3],e:lastNumbers[4],f:lastNumbers[5],g:lastNumbers[6],h:lastNumbers[7],i:lastNumbers[8],j:lastNumbers[9],k:lastNumbers[10],l:lastNumbers[11]});
      }else if (currentNumber < targetNumber&&currentNumber!==0) {
        currentNumber += 1;
        io.emit('spinPlaced',{red:firstBet,yellow:secondBet,blue:thirdBet})
        io.emit('luckyBet', { number: currentNumber, time: timeRemaining, spin:spin,result: winner,firstBet:a,secondBet:b,thirdBet:c,a:lastNumbers[0],b:lastNumbers[1],c:lastNumbers[2],d:lastNumbers[3],e:lastNumbers[4],f:lastNumbers[5],f:lastNumbers[5],g:lastNumbers[6],h:lastNumbers[7],i:lastNumbers[8],j:lastNumbers[9],k:lastNumbers[10],l:lastNumbers[11] });
      }
      else if(currentNumber===0&&timeRemaining===0){
        currentNumber++;
        io.emit('spinPlaced',{red:firstBet,yellow:secondBet,blue:thirdBet})
        io.emit('luckyBet', { number: currentNumber, time: timeRemaining,spin:spin, result: winner,firstBet:a,secondBet:b,thirdBet:c,a:lastNumbers[0],b:lastNumbers[1],c:lastNumbers[2],d:lastNumbers[3],e:lastNumbers[4],f:lastNumbers[5],f:lastNumbers[5],g:lastNumbers[6],h:lastNumbers[7],i:lastNumbers[8],j:lastNumbers[9],k:lastNumbers[10],l:lastNumbers[11]  });

        spin=true
        if(firstBet===0&&secondBet===0&&thirdBet===0){
          winner=Math.floor(Math.random() * 2)+1;
        }
        else if (firstBet <= secondBet) {
          if (firstBet <= thirdBet) {
            winner = 0;
          } else {
            winner = 2;
          }
        } else {
          if (secondBet < thirdBet) {
            winner = 1;
          } else {
            winner = 2;
          }
        }
        lastNumbers.push(winner)
        if(lastNumbers.length>12){
          lastNumbers.shift();
        }
      }  
      else {
        a=Math.floor(Math.random() * (191)) + 10;
        b=Math.floor(Math.random() * (191)) + 10;
        c=Math.floor(Math.random() * (191)) + 10;
        firstBet = 0;
        secondBet = 0;
        thirdBet = 0;

        clearInterval(intervalId);
        generateAndBroadcast();
        
       
      }
    }, 1000); // Reduced the interval to 1000ms (1 second)
  };

  // Call generateAndBroadcast to start the initial round
  generateAndBroadcast();
};

const sendLuckyMoney = async (io, phone, color, amount) => {
  try {
    let userTransaction = await LuckyTransaction.findOne({ phone });
    const sender = await User.findOne({ phone });
    if (!sender) {
      throw new Error('Sender not found');
    }

    if (!userTransaction) {
      userTransaction = new LuckyTransaction({
        phone,
        transactions: [],
      });
    }

    if (color === 0) {
      firstBet += 9 * amount; // Adjusted the multiplier
    } else if (color === 1) {
      secondBet += 2 * amount; // Adjusted the multiplier
    } else {
      thirdBet += 2 * amount; // Adjusted the multiplier
    }

    userTransaction.transactions.push({ color, amount: -amount });
    await userTransaction.save(); // Removed unnecessary array wrapping
    
    if (sender.wallet < amount) {
      io.emit('walletLuckyUpdated', {phone:phone, error: 'Insufficient Funds' });
      return { success: false, message: 'InSufficient FUnds' };
    } else {
      sender.wallet -= amount;
      await sender.save();

      io.emit('walletLuckyUpdated', { phone, newBalance: sender.wallet, color });
    
      return { success: true, message: 'Money sent successfully',newBalance:sender.wallet,color };
    }
  } catch (error) {
    io.emit('walletLuckyUpdated', { error: 'Failed to send money. Please try again.' });
    throw new Error('Failed to send money. Please try again.');
  }
};
  
  const receiveMoney = async (io, phone, color, amount) => {
    let winning=0;
    try {
      const [sender, userTransaction] = await Promise.all([
        User.findOne({ phone }),
        LuckyTransaction.findOne({ phone })
      ]);
      if (!sender) {
        throw new Error('Sender not found');
      }
      // Initialize userTransaction if not found
      let newUserTransaction = userTransaction;
      if (!newUserTransaction) {
        newUserTransaction = new LuckyTransaction({
          phone,
          transactions: []
        });
      }
      if(color===winner){
        if(color===0){
          winning=amount*9;
        }
        else{
          winning=amount*2;
        }

      }
  
      const referredUsers = await User.findOne({ refer_id: { $in: sender.user_id } });
      if (referredUsers) {
        const referralBonus = 0.05 * winning;
  
        // Add the referral bonus to the referring user's account
        referredUsers.referred_wallet += referralBonus;
        console.log(`>>>>>>>>>>>5`)
        let ref = await Ref.findOne({ phone: referredUsers.phone });
        if (ref) {
          ref.referred.push({
            user_id: sender.user_id,
            avatar: sender.avatar,
            amount: referralBonus
          });
        } else {
          console.log(`>>>>>>>>>>>>>>6`)
          ref = new Ref({
            phone: referredUsers.phone,
            referred: [{
              user_id: sender.user_id,
              avatar: sender.avatar,
              amount: referralBonus
            }]
          });
        }
  
        // Save the updated referring user and the Ref model
        await Promise.all([referredUsers.save(), ref.save()]);
      }
      console.log(`>>>>>>>>>7>>>>>`)
  
      sender.wallet +=winning;
      sender.withdrwarl_amount += winning;
      await sender.save();
      newUserTransaction.transactions.push({color: color, amount:winning});
  
      // Use a batch save for better performance
      await Promise.all([newUserTransaction.save(), sender.save()]);
  
      io.emit('walletLuckyUpdated', { phone, newBalance: sender.wallet });
  
      return { success: true, message: 'Money received successfully',newBalance:sender.wallet };
    } catch (error) {
      throw new Error('Server responded falsely');
    }
  };
  
  const getLuckyTransactions = async (req, res) => {
    const { phone } = req.query;
  
    
    try {
      const userTransactions = await LuckyTransaction.findOne({ phone });
  
      if (!userTransactions) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json({ transactions: userTransactions.transactions });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  module.exports = {
    generateAndBroadcastNumber,
    sendLuckyMoney,
    receiveMoney,
    getLuckyTransactions
  };
  