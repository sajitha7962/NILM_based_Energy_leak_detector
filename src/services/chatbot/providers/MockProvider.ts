import { ChatMessage, ChatProvider } from '../Provider';

export class MockProvider implements ChatProvider {
  async sendMessage(history: ChatMessage[], language: string): Promise<string> {
    const lastMsg = history[history.length - 1].content.toLowerCase();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        let response = '';

        if (language === 'ta') {
          if (lastMsg.includes('cnn')) response = '1D CNN (Convolutional Neural Network) என்பது ஆற்றல் பயன்பாட்டுத் தரவை பகுப்பாய்வு செய்து, எந்தெந்த சாதனங்கள் இயங்குகின்றன என்பதை அடையாளம் காணும் ஒரு இயந்திர கற்றல் மாதிரியாகும்.';
          else if (lastMsg.includes('கசிவு') || lastMsg.includes('leak')) response = 'கசிவுகளைக் கண்டறிய நாங்கள் Isolation Forest அல்காரிதத்தைப் பயன்படுத்துகிறோம். தற்போது எந்த கசிவும் இல்லை.';
          else if (lastMsg.includes('குறை') || lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'ஸ்டாண்ட்பை சாதனங்களை (Phantom loads) அணைப்பதன் மூலம் நீங்கள் மின் கட்டணத்தைக் குறைக்கலாம்.';
          else response = 'உங்கள் கேள்வியைப் புரிந்துகொண்டேன். எங்கள் EnergyGuard AI கணினி உங்கள் வீட்டின் மின் பயன்பாட்டை 24/7 கண்காணிக்கிறது.';
        } 
        else if (language === 'te') {
          if (lastMsg.includes('cnn')) response = '1D CNN అనేది విద్యుత్ వినియోగ డేటాను విశ్లేషించి, ఏ పరికరాలు పనిచేస్తున్నాయో గుర్తించే ఒక మెషిన్ లెర్నింగ్ మోడల్.';
          else if (lastMsg.includes('లీక్') || lastMsg.includes('leak')) response = 'లీక్‌లను గుర్తించడానికి మేము ఐసోలేషన్ ఫారెస్ట్ అల్గారిథమ్‌ను ఉపయోగిస్తాము. ప్రస్తుతం ఎలాంటి లీక్‌లు లేవు.';
          else if (lastMsg.includes('తగ్గి') || lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'స్టాండ్‌బై పరికరాలను ఆపివేయడం ద్వారా మీరు విద్యుత్ బిల్లును తగ్గించుకోవచ్చు.';
          else response = 'మీ ప్రశ్న అర్థమైంది. మా ఎనర్జీగార్డ్ AI మీ ఇంటి విద్యుత్ వినియోగాన్ని ఎల్లప్పుడూ పర్యవేక్షిస్తుంది.';
        }
        else if (language === 'hi') {
          if (lastMsg.includes('cnn')) response = '1D CNN एक मशीन लर्निंग मॉडल है जो ऊर्जा उपयोग डेटा का विश्लेषण करता है और यह पहचानता है कि कौन से उपकरण चल रहे हैं।';
          else if (lastMsg.includes('लीक') || lastMsg.includes('leak')) response = 'लीक का पता लगाने के लिए हम आइसोलेशन फॉरेस्ट एल्गोरिदम का उपयोग करते हैं। वर्तमान में कोई लीक नहीं है।';
          else if (lastMsg.includes('कम') || lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'स्टैंडबाय उपकरणों को बंद करके आप अपना बिजली बिल कम कर सकते हैं।';
          else response = 'मुझे आपका प्रश्न समझ में आया। हमारा EnergyGuard AI हमेशा आपके घर की बिजली की निगरानी करता है।';
        }
        else if (language === 'kn') {
          if (lastMsg.includes('cnn')) response = '1D CNN ಎಂಬುದು ಶಕ್ತಿಯ ಬಳಕೆಯ ಡೇಟಾವನ್ನು ವಿಶ್ಲೇಷಿಸುವ ಮತ್ತು ಯಾವ ಉಪಕರಣಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ ಎಂಬುದನ್ನು ಗುರುತಿಸುವ ಯಂತ್ರ ಕಲಿಕೆ ಮಾದರಿಯಾಗಿದೆ.';
          else if (lastMsg.includes('ಸೋರಿಕೆ') || lastMsg.includes('leak')) response = 'ಸೋರಿಕೆಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು ನಾವು ಐಸೊಲೇಶನ್ ಫಾರೆಸ್ಟ್ ಅಲ್ಗಾರಿದಮ್ ಅನ್ನು ಬಳಸುತ್ತೇವೆ. ಪ್ರಸ್ತುತ ಯಾವುದೇ ಸೋರಿಕೆಗಳಿಲ್ಲ.';
          else if (lastMsg.includes('ಕಡಿಮೆ') || lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'ಸ್ಟ್ಯಾಂಡ್‌ಬೈ ಸಾಧನಗಳನ್ನು ಆಫ್ ಮಾಡುವ ಮೂಲಕ ನೀವು ವಿದ್ಯುತ್ ಬಿಲ್ ಅನ್ನು ಕಡಿಮೆ ಮಾಡಬಹುದು.';
          else response = 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಅರ್ಥವಾಯಿತು. ನಮ್ಮ EnergyGuard AI ಯಾವಾಗಲೂ ನಿಮ್ಮ ಮನೆಯ ವಿದ್ಯುತ್ ಬಳಕೆಯನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತದೆ.';
        }
        else if (language === 'ml') {
          if (lastMsg.includes('cnn')) response = 'ഊർജ്ജ ഉപയോഗ ഡാറ്റ വിശകലനം ചെയ്യാനും ഏതൊക്കെ ഉപകരണങ്ങളാണ് പ്രവർത്തിക്കുന്നതെന്ന് തിരിച്ചറിയാനുമുള്ള ഒരു മെഷീൻ ലേണിംഗ് മോഡലാണ് 1D CNN.';
          else if (lastMsg.includes('ചോർച്ച') || lastMsg.includes('leak')) response = 'ചോർച്ച കണ്ടെത്താൻ ഞങ്ങൾ ഐസൊലേഷൻ ഫോറസ്റ്റ് അൽഗോരിതം ഉപയോഗിക്കുന്നു. നിലവിൽ ചോർച്ചകളൊന്നുമില്ല.';
          else if (lastMsg.includes('കുറ') || lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'സ്റ്റാൻഡ്‌ബൈ ഉപകരണങ്ങൾ ഓഫ് ചെയ്യുന്നതിലൂടെ നിങ്ങൾക്ക് വൈദ്യുതി ബിൽ കുറയ്ക്കാം.';
          else response = 'നിങ്ങളുടെ ചോദ്യം എനിക്ക് മനസ്സിലായി. ഞങ്ങളുടെ EnergyGuard AI എപ്പോഴും നിങ്ങളുടെ വീടിന്റെ വൈദ്യുതി നിരീക്ഷിക്കുന്നു.';
        }
        else {
          // Default English
          if (lastMsg.includes('cnn')) response = '1D CNN (Convolutional Neural Network) is our machine learning model that analyzes raw energy data to disaggregate and identify which appliances are running.';
          else if (lastMsg.includes('leak')) response = 'We use an Isolation Forest algorithm to detect anomalies or energy leaks based on historical divergence. Currently, the system is secure.';
          else if (lastMsg.includes('reduce') || lastMsg.includes('bill')) response = 'You can significantly reduce your electricity bill by identifying and eliminating "phantom loads" (devices consuming power on standby).';
          else if (lastMsg.includes('refrigerator')) response = 'Analyzing refrigerator data... Your refrigerator appears to be running in normal cooling cycles. Make sure the door is tightly sealed to prevent extra energy draw.';
          else if (lastMsg.includes('graph')) response = 'The live graph shows the real-time aggregate power consumption (in Watts) of your entire household, sampled at high frequency.';
          else if (lastMsg.includes('most power')) response = 'Based on current data, cooling and heating appliances like AC units or water heaters typically consume the most power.';
          else if (lastMsg.includes('phantom')) response = 'Phantom load (or standby power) refers to the electric power consumed by electronic and electrical appliances while they are switched off or in a standby mode.';
          else if (lastMsg.includes('isolation forest')) response = 'Isolation Forest is an unsupervised anomaly detection algorithm. It isolates observations by randomly selecting a feature and then randomly selecting a split value.';
          else response = 'I understand your question. Our EnergyGuard AI system continuously monitors your home 24/7 to provide intelligent insights.';
        }

        resolve(response);
      }, 1200); // simulate network latency
    });
  }
}
