import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const MarketStep = ({ isWizard, onNext }) => {
  const onboarding = useOnboarding();
  const updateStep = isWizard ? null : onboarding.updateStep;
  const data = isWizard ? {} : onboarding.data;
  
  const [country, setCountry] = useState(data.country || "ZW");
  const [language, setLanguage] = useState(data.language || "en");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isWizard) {
        onNext({ country, language });
      } else {
        await updateStep(5, { country, language });
      }
    } catch (err) {
      console.error("Market context update failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card">
      <h2 className="fw-bold mb-2">Target Market</h2>
      <p className="text-muted small mb-4">Where is your audience? Define your strategic zone.</p>

      <form onSubmit={handleSubmit}>
        <div className="row g-3 mb-4 text-start">
          <div className="col-12">
            <label className="form-label small fw-bold text-uppercase">Primary Market</label>
            <select 
              className="form-control border-2" 
              value={country} 
              onChange={(e) => setCountry(e.target.value)}
              disabled={loading}
              style={{ fontSize: '0.9rem' }}
            >
              <optgroup label="Africa">
                <option value="NG">Nigeria</option>
                <option value="ZA">South Africa</option>
                <option value="KE">Kenya</option>
                <option value="ZW">Zimbabwe</option>
                <option value="GH">Ghana</option>
                <option value="EG">Egypt</option>
                <option value="MA">Morocco</option>
                <option value="ET">Ethiopia</option>
                <option value="UG">Uganda</option>
                <option value="DZ">Algeria</option>
                <option value="TZ">Tanzania</option>
                <option value="RW">Rwanda</option>
                <option value="TN">Tunisia</option>
                <option value="BW">Botswana</option>
                <option value="NA">Namibia</option>
                <option value="MU">Mauritius</option>
                <option value="CI">Ivory Coast</option>
                <option value="SN">Senegal</option>
                <option value="CM">Cameroon</option>
                <option value="ZM">Zambia</option>
                <option value="AO">Angola</option>
                <option value="MZ">Mozambique</option>
                <option value="MG">Madagascar</option>
                <option value="MW">Malawi</option>
                <option value="BJ">Benin</option>
                <option value="TG">Togo</option>
                <option value="GM">Gambia</option>
                <option value="SC">Seychelles</option>
                <option value="LS">Lesotho</option>
                <option value="SZ">Eswatini</option>
              </optgroup>
              <optgroup label="Europe">
                <option value="UK">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="CH">Switzerland</option>
                <option value="SE">Sweden</option>
                <option value="IE">Ireland</option>
                <option value="PL">Poland</option>
                <option value="BE">Belgium</option>
                <option value="AT">Austria</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="PT">Portugal</option>
                <option value="GR">Greece</option>
                <option value="CZ">Czech Republic</option>
                <option value="HU">Hungary</option>
                <option value="RO">Romania</option>
              </optgroup>
              <optgroup label="Americas">
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="CO">Colombia</option>
                <option value="PE">Peru</option>
                <option value="VE">Venezuela</option>
              </optgroup>
              <optgroup label="Asia & Oceania">
                <option value="IN">India</option>
                <option value="CN">China</option>
                <option value="JP">Japan</option>
                <option value="KR">South Korea</option>
                <option value="SG">Singapore</option>
                <option value="AE">UAE</option>
                <option value="SA">Saudi Arabia</option>
                <option value="ID">Indonesia</option>
                <option value="TH">Thailand</option>
                <option value="MY">Malaysia</option>
                <option value="VN">Vietnam</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
              </optgroup>
              <option value="GLOBAL">Global / International</option>
            </select>
          </div>

          <div className="col-12">
            <label className="form-label small fw-bold text-uppercase">Primary Language</label>
            <select 
              className="form-control border-2" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              style={{ fontSize: '0.9rem' }}
            >
              <option value="en">English (Global)</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="ar">Arabic</option>
              <option value="zh">Chinese</option>
              <option value="hi">Hindi</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="ja">Japanese</option>
              <option value="sw">Swahili</option>
              <option value="yo">Yoruba</option>
              <option value="zu">Zulu</option>
              <option value="sn">Shona</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-pilot-ob w-100 d-flex align-items-center justify-content-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm" role="status"></span>
          ) : (
            <>Continue <i className="fas fa-arrow-right"></i></>
          )}
        </button>
      </form>
    </div>
  );
};

export default MarketStep;

