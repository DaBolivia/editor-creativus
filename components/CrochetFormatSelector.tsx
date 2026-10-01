                        <option key={font} style={{ fontFamily: font }} value={font}>
                          {font}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className={styles.generateButton}
                  disabled={!textValue.trim() || !editorReady || !selectedFont || isGeneratingPreview}
                  type="submit"
                >
                  {isGeneratingPreview ? "Ajustando sua escrita..." : "Gerar visualização da escrita"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}
            {personalizationError && (
              <div className={styles.personalizationError} role="alert">
                <strong>Erro:</strong> <span>{personalizationError}</span>
              </div>
            )}
          </div>
        )}
        {/* TELA 3 - VISUALIZAÇÃO FINAL */}
        {selectedFormat && (
          <div style={{ display: showPreview ? "block" : "none" }}>
            <div
              className={styles.previewHeader}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#933342",
                    fontWeight: 600,
                  }}
                >
                  Etapa 3 · Tela de Visualização
                </span>
                <h3 style={{ margin: "5px 0", fontSize: "24px" }}>Veja como seu aplique ficou</h3>
              </div>
              <button
                disabled={isSaving}
                onClick={() => {
                  if (savingRef.current) return;
                  setShowPreview(false);
                  setPreviewRequest(null);
                  setIsGeneratingPreview(false);
                  scrollToTopInParent();
                }}
                type="button"
                style={btnVoltarStyle}
              >
                ← Voltar e alterar
              </button>
            </div>
            {showPreview && editorStatus && (
              <div className={styles.editorStatus} role="status">
                <span className={styles.statusDot} /> {editorStatus}
              </div>
            )}
            <div
              style={{
                width: "100%",
                height: "700px",
                backgroundColor: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {editorUrl ? (
                <iframe
                  allow="clipboard-read; clipboard-write"
                  className={styles.editorFrame}
                  ref={iframeRef}
                  src={editorUrl}
                  title={`Visualização do formato ${selectedFormat.title}`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <div className={styles.editorLoading}>Preparando o visualizador...</div>
              )}
            </div>
            {/* Salvar primeiro; abrir o WhatsApp em um novo toque. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "25px", paddingBottom: "20px" }}>
              {whatsappUrl ? (
                <>
                  <p role="status" style={{ margin: 0, textAlign: "center" }}>
                    Arte salva! Toque abaixo para abrir o WhatsApp com seu código.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#25D366", color: "#fff", padding: "16px 32px", borderRadius: "8px", fontWeight: 700, fontSize: "18px", textDecoration: "none", textAlign: "center", display: "inline-block", boxShadow: "0 4px 6px rgba(37, 211, 102, 0.3)" }}
                  >
                    Enviar pelo WhatsApp
                  </a>
                </>
              ) : (
                <button
                  onClick={handleApproveAndSend}
                  disabled={isSaving || !editorReady || isGeneratingPreview}
                  type="button"
                  style={{ backgroundColor: "#25D366", color: "#fff", padding: "16px 32px", borderRadius: "8px", border: "none", fontWeight: 700, fontSize: "18px", cursor: isSaving ? "wait" : "pointer", opacity: isSaving || !editorReady || isGeneratingPreview ? 0.7 : 1, boxShadow: "0 4px 6px rgba(37, 211, 102, 0.3)" }}
                >
                  {isSaving ? "Salvando sua arte..." : "Aprovar e salvar arte"}
                </button>
              )}
              {personalizationError && (
                <div className={styles.personalizationError} role="alert">
                  {personalizationError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>